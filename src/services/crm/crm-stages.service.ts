import {
  deleteCrmFeedbackType,
  deleteCrmStage,
  fetchCrmFeedbackTypes,
  fetchCrmStages,
  putCrmFeedbackType,
  putCrmStage,
  reorderCrmStages,
} from "@/api/crm.api";
import { isApiMode } from "@/lib/env";
import { enrichWithAudit, touchEntity } from "@/lib/entity";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { createId } from "@/lib/id";
import { ensureCrmList } from "@/lib/crm-normalize";
import { emitCrmUpdated } from "@/lib/events";
import {
  crmFeedbackTypeRepository,
  crmLeadFeedbackRepository,
  crmLeadRepository,
  crmStageRepository,
} from "@/repositories/crm.repository";
import {
  feedbackTypeSchema,
  stageSchema,
  type FeedbackTypeInput,
  type StageInput,
} from "@/schemas/crm.schema";
import { fail, fromError, ok } from "@/services/api-result";
import { simulateDelay } from "@/services/fake-api";
import { getSessionUserId } from "@/stores/session-store";
import type { ApiResponse } from "@/types";
import type { CrmFeedbackType, CrmHistoryAction, CrmStage } from "@/types/crm";
import { assertCap, ensureCatalog, writeHistory } from "@/services/crm/crm-shared";

export async function getCrmStages(): Promise<ApiResponse<CrmStage[]>> {
  if (isApiMode()) {
    const res = await fetchCrmStages();
    return { ...res, data: ensureCrmList(res.data) };
  }
  try {
    await simulateDelay();
    const { stages } = await ensureCatalog();
    return ok(stages);
  } catch (error) {
    return fromError(error, []);
  }
}

export async function upsertCrmStage(
  input: StageInput
): Promise<ApiResponse<CrmStage | null>> {
  if (isApiMode()) return putCrmStage(input);
  try {
    assertCap("manage_stages");
    await simulateDelay();
    const parsed = stageSchema.parse(input);
    const actorId = getSessionUserId() || "system";
    const { stages } = await ensureCatalog();

    if (parsed.id) {
      const existing = await crmStageRepository.findById(parsed.id);
      if (!existing) throw new NotFoundError("Stage not found");
      const updated = touchEntity(
        existing,
        actorId,
        {
          name: parsed.name,
          description: parsed.description ?? "",
          color: parsed.color,
          sortOrder: parsed.sortOrder ?? existing.sortOrder,
          active: parsed.active,
          conversionProbability: parsed.conversionProbability ?? null,
          category: parsed.category,
        }
      );
      await crmStageRepository.update(updated.id, updated);
      await writeHistory({
        leadId: null,
        action: "stage_updated" satisfies CrmHistoryAction,
        actorId,
        actorName: "",
        note: `Updated stage ${updated.name}`,
        previousValue: existing.name,
        newValue: updated.name,
      });
      emitCrmUpdated();
      return ok(updated);
    }

    const row = enrichWithAudit(
      {
        id: createId("crm-stage"),
        name: parsed.name,
        description: parsed.description ?? "",
        color: parsed.color ?? "#64748b",
        sortOrder: parsed.sortOrder ?? stages.length,
        active: parsed.active ?? true,
        conversionProbability: parsed.conversionProbability ?? null,
        category: parsed.category ?? "open",
      },
      actorId
    );
    await crmStageRepository.create(row);
    await writeHistory({
      leadId: null,
      action: "stage_created",
      actorId,
      actorName: "",
      note: `Created stage ${row.name}`,
      previousValue: null,
      newValue: row.name,
    });
    emitCrmUpdated();
    return ok(row);
  } catch (error) {
    return fromError(error, null);
  }
}

export async function reorderCrmStageList(
  ids: string[]
): Promise<ApiResponse<CrmStage[]>> {
  if (isApiMode()) return reorderCrmStages(ids);
  try {
    assertCap("manage_stages");
    await simulateDelay();
    const actorId = getSessionUserId() || "system";
    const stages = await crmStageRepository.findAll();
    const byId = new Map(stages.map((s) => [s.id, s]));
    const updated: CrmStage[] = [];
    for (let i = 0; i < ids.length; i++) {
      const stage = byId.get(ids[i]);
      if (!stage) continue;
      const next = touchEntity(stage, actorId, { sortOrder: i });
      await crmStageRepository.update(next.id, next);
      updated.push(next);
    }
    emitCrmUpdated();
    return ok(updated.sort((a, b) => a.sortOrder - b.sortOrder));
  } catch (error) {
    return fromError(error, []);
  }
}

export async function removeCrmStage(
  id: string,
  moveToStageId?: string
): Promise<ApiResponse<{ ok: boolean; leadCount?: number }>> {
  if (isApiMode()) {
    const res = await deleteCrmStage(id, moveToStageId);
    if (res.success) return res;
    const details = res.error?.details as
      | { leadCount?: number; code?: string }
      | undefined;
    const leadCount =
      typeof details?.leadCount === "number" ? details.leadCount : undefined;
    const nestCode = details?.code;
    if (nestCode === "STAGE_HAS_LEADS" || typeof leadCount === "number") {
      return fail(
        { ok: false, leadCount: leadCount ?? 0 },
        res.message ?? "Stage has leads",
        "STAGE_HAS_LEADS",
        details
      );
    }
    return res;
  }
  try {
    assertCap("manage_stages");
    await simulateDelay();
    const stage = await crmStageRepository.findById(id);
    if (!stage) throw new NotFoundError("Stage not found");
    const leads = (await crmLeadRepository.findAll()).filter(
      (l) => l.stageId === id
    );
    if (leads.length > 0) {
      if (!moveToStageId) {
        return fail(
          { ok: false, leadCount: leads.length },
          `This stage contains ${leads.length} leads. Move them before deleting.`,
          "STAGE_HAS_LEADS"
        );
      }
      if (moveToStageId === id) {
        throw new ValidationError("Choose a different stage for these leads");
      }
      const target = await crmStageRepository.findById(moveToStageId);
      if (!target) throw new NotFoundError("Target stage not found");
      const actorId = getSessionUserId() || "system";
      for (const lead of leads) {
        await crmLeadRepository.update(lead.id, touchEntity(lead, actorId, { stageId: moveToStageId })
        );
      }
    }
    await crmStageRepository.delete(id);
    await writeHistory({
      leadId: null,
      action: "stage_deleted",
      actorId: getSessionUserId() || "system",
      actorName: "",
      note: `Deleted stage ${stage.name}`,
      previousValue: stage.name,
      newValue: moveToStageId ?? null,
    });
    emitCrmUpdated();
    return ok({ ok: true });
  } catch (error) {
    return fromError(error, { ok: false });
  }
}

export async function getCrmFeedbackTypes(): Promise<
  ApiResponse<CrmFeedbackType[]>
> {
  if (isApiMode()) {
    const res = await fetchCrmFeedbackTypes();
    return { ...res, data: ensureCrmList(res.data) };
  }
  try {
    await simulateDelay();
    const { feedbackTypes } = await ensureCatalog();
    return ok(feedbackTypes);
  } catch (error) {
    return fromError(error, []);
  }
}

export async function upsertCrmFeedbackType(
  input: FeedbackTypeInput
): Promise<ApiResponse<CrmFeedbackType | null>> {
  if (isApiMode()) return putCrmFeedbackType(input);
  try {
    assertCap("manage_feedback_types");
    await simulateDelay();
    const parsed = feedbackTypeSchema.parse(input);
    const actorId = getSessionUserId() || "system";
    if (parsed.id) {
      const existing = await crmFeedbackTypeRepository.findById(parsed.id);
      if (!existing) throw new NotFoundError("Feedback type not found");
      const updated = touchEntity(existing, actorId, {
        name: parsed.name,
        description: parsed.description ?? "",
        sortOrder: parsed.sortOrder ?? existing.sortOrder,
        active: parsed.active,
        isLossReason: parsed.isLossReason,
      });
      await crmFeedbackTypeRepository.update(updated.id, updated);
      emitCrmUpdated();
      return ok(updated);
    }
    const all = await crmFeedbackTypeRepository.findAll();
    const row = enrichWithAudit(
      {
        id: createId("crm-ft"),
        name: parsed.name,
        description: parsed.description ?? "",
        sortOrder: parsed.sortOrder ?? all.length,
        active: parsed.active ?? true,
        isLossReason: parsed.isLossReason ?? false,
      },
      actorId
    );
    await crmFeedbackTypeRepository.create(row);
    emitCrmUpdated();
    return ok(row);
  } catch (error) {
    return fromError(error, null);
  }
}

export async function removeCrmFeedbackType(
  id: string
): Promise<ApiResponse<{ ok: boolean }>> {
  if (isApiMode()) return deleteCrmFeedbackType(id);
  try {
    assertCap("manage_feedback_types");
    await simulateDelay();
    const used = (await crmLeadFeedbackRepository.findAll()).some(
      (f) => f.feedbackTypeId === id
    );
    if (used) {
      throw new ValidationError(
        "This feedback type is in use. Deactivate it instead of deleting."
      );
    }
    await crmFeedbackTypeRepository.delete(id);
    emitCrmUpdated();
    return ok({ ok: true });
  } catch (error) {
    return fromError(error, { ok: false });
  }
}
