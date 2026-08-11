import { patchCrmLead, postCrmLead } from "@/api/crm.api";
import { isApiMode } from "@/lib/env";
import { enrichWithAudit, touchEntity } from "@/lib/entity";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { createId } from "@/lib/id";
import { canCrm } from "@/lib/crm-policies";
import { emitCrmUpdated } from "@/lib/events";
import {
  crmLeadActivityRepository,
  crmLeadRepository,
} from "@/repositories/crm.repository";
import {
  createLeadSchema,
  updateLeadSchema,
  type CreateLeadInput,
  type UpdateLeadInput,
} from "@/schemas/crm.schema";
import { fromError, ok } from "@/services/api-result";
import { simulateDelay } from "@/services/fake-api";
import {
  authPermissionSet,
  getSessionRole,
  getSessionUserId,
} from "@/stores/session-store";
import type { ApiResponse } from "@/types";
import type { CrmLead } from "@/types/crm";
import {
  actorEmployeeId,
  assertCap,
  assertLeadAccess,
  ensureCatalog,
  isAdmin,
  writeHistory,
} from "@/services/crm/crm-shared";

export async function createCrmLead(
  input: CreateLeadInput
): Promise<ApiResponse<CrmLead | null>> {
  if (isApiMode()) return postCrmLead(input);
  try {
    assertCap("create");
    await simulateDelay();
    const parsed = createLeadSchema.parse(input);
    const { stages, subStages } = await ensureCatalog();
    if (!stages.some((s) => s.id === parsed.stageId)) {
      throw new ValidationError("Please select a valid stage");
    }
    const subStageId = parsed.subStageId ?? null;
    if (subStageId) {
      const sub = subStages.find((s) => s.id === subStageId);
      if (!sub || sub.stageId !== parsed.stageId) {
        throw new ValidationError("Please select a valid sub-stage");
      }
    }
    const actorId = getSessionUserId() || "system";
    const empId = actorEmployeeId()?.trim() || null;
    let ownerEmployeeId = parsed.ownerEmployeeId ?? empId;
    if (!isAdmin()) {
      if (!empId) {
        throw new ForbiddenError("You can only create leads assigned to you");
      }
      ownerEmployeeId = empId;
    }
    const now = new Date().toISOString();
    const row = enrichWithAudit(
      {
        id: createId("crm-lead"),
        name: parsed.name,
        phone: parsed.phone,
        email: parsed.email ?? "",
        companyName: parsed.companyName ?? "",
        businessTypeId: parsed.businessTypeId ?? null,
        source: parsed.source,
        ownerEmployeeId: ownerEmployeeId ?? null,
        stageId: parsed.stageId,
        subStageId,
        status: parsed.status ?? "active",
        tags: parsed.tags ?? [],
        nextAction: parsed.nextAction ?? "none",
        nextFollowUpAt: parsed.nextFollowUpAt ?? null,
        lastActivityAt: now,
        lossReasonTypeId: null,
        notes: parsed.notes ?? "",
        convertedAt: null,
      },
      actorId
    );
    await crmLeadRepository.create(row);
    const activity = enrichWithAudit(
      {
        id: createId("crm-act"),
        leadId: row.id,
        type: "created" as const,
        title: "Lead created",
        description: `${row.name} added to CRM`,
        actorEmployeeId: empId,
        occurredAt: now,
      },
      actorId
    );
    await crmLeadActivityRepository.create(activity);
    await writeHistory({
      leadId: row.id,
      action: "lead_created",
      actorId,
      actorName: "",
      note: "Lead created",
      previousValue: null,
      newValue: row.name,
    });
    emitCrmUpdated();
    return ok(row);
  } catch (error) {
    return fromError(error, null);
  }
}

export async function updateCrmLead(
  id: string,
  input: UpdateLeadInput
): Promise<ApiResponse<CrmLead | null>> {
  if (isApiMode()) return patchCrmLead(id, input);
  try {
    assertCap("edit");
    await simulateDelay();
    const existing = await crmLeadRepository.findById(id);
    if (!existing) throw new NotFoundError("Lead not found");
    assertLeadAccess(existing);
    const parsed = updateLeadSchema.parse(input);
    const actorId = getSessionUserId() || "system";
    const empId = actorEmployeeId();
    const { stages, subStages } = await ensureCatalog();

    if (parsed.ownerEmployeeId !== undefined && parsed.ownerEmployeeId !== existing.ownerEmployeeId) {
      if (!canCrm(getSessionRole(), "assign", authPermissionSet())) {
        throw new ForbiddenError("You cannot reassign leads");
      }
    }

    let convertedAt = existing.convertedAt;
    const lossReasonTypeId =
      parsed.lossReasonTypeId !== undefined
        ? parsed.lossReasonTypeId
        : existing.lossReasonTypeId;

    const nextStageId = parsed.stageId ?? existing.stageId;
    let nextSubStageId =
      parsed.subStageId !== undefined
        ? parsed.subStageId
        : existing.subStageId;

    if (parsed.stageId && parsed.stageId !== existing.stageId) {
      const nextStage = stages.find((s) => s.id === parsed.stageId);
      const prevStage = stages.find((s) => s.id === existing.stageId);
      if (!nextStage) throw new ValidationError("Please select a valid stage");
      if (nextStage.category === "won") {
        convertedAt = new Date().toISOString();
      }
      if (nextStage.category === "lost") {
        if (!lossReasonTypeId) {
          throw new ValidationError("Please select a loss reason");
        }
        convertedAt = null;
      }
      if (
        nextSubStageId &&
        !subStages.some(
          (s) => s.id === nextSubStageId && s.stageId === nextStageId
        )
      ) {
        nextSubStageId = null;
      }
      const activity = enrichWithAudit(
        {
          id: createId("crm-act"),
          leadId: id,
          type: "stage_change" as const,
          title: "Stage changed",
          description: `${prevStage?.name ?? "—"} → ${nextStage.name}`,
          actorEmployeeId: empId,
          occurredAt: new Date().toISOString(),
        },
        actorId
      );
      await crmLeadActivityRepository.create(activity);
      await writeHistory({
        leadId: id,
        action: "stage_changed",
        actorId,
        actorName: "",
        note: "Stage changed",
        previousValue: prevStage?.name ?? existing.stageId,
        newValue: nextStage.name,
      });
    }

    if (nextSubStageId) {
      const sub = subStages.find((s) => s.id === nextSubStageId);
      if (!sub || sub.stageId !== nextStageId) {
        throw new ValidationError("Please select a valid sub-stage");
      }
    }

    if (
      parsed.ownerEmployeeId !== undefined &&
      parsed.ownerEmployeeId !== existing.ownerEmployeeId
    ) {
      await writeHistory({
        leadId: id,
        action: existing.ownerEmployeeId ? "lead_reassigned" : "lead_assigned",
        actorId,
        actorName: "",
        note: "Assignment changed",
        previousValue: existing.ownerEmployeeId,
        newValue: parsed.ownerEmployeeId,
      });
      const activity = enrichWithAudit(
        {
          id: createId("crm-act"),
          leadId: id,
          type: "assignment" as const,
          title: "Assignment changed",
          description: "Lead owner updated",
          actorEmployeeId: empId,
          occurredAt: new Date().toISOString(),
        },
        actorId
      );
      await crmLeadActivityRepository.create(activity);
    }

    const updated = touchEntity(existing, actorId, {
      ...parsed,
      stageId: nextStageId,
      subStageId: nextSubStageId,
      email: parsed.email ?? existing.email,
      companyName: parsed.companyName ?? existing.companyName,
      tags: parsed.tags ?? existing.tags,
      convertedAt,
      lossReasonTypeId,
      lastActivityAt: new Date().toISOString(),
    });
    await crmLeadRepository.update(updated.id, updated);
    emitCrmUpdated();
    return ok(updated);
  } catch (error) {
    return fromError(error, null);
  }
}
