import {
  fetchCrmActivities,
  fetchCrmFeedbackList,
  fetchCrmLeadTimeline,
  postCrmLeadActivity,
  postCrmLeadFeedback,
} from "@/api/crm.api";
import { isApiMode } from "@/lib/env";
import { enrichWithAudit, touchEntity } from "@/lib/entity";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { createId } from "@/lib/id";
import {
  ensureCrmList,
  ensureLeadFeedbackList,
  ensureLeadTimeline,
} from "@/lib/crm-normalize";
import { emitCrmUpdated } from "@/lib/events";
import {
  crmLeadActivityRepository,
  crmLeadFeedbackRepository,
  crmLeadRepository,
} from "@/repositories/crm.repository";
import {
  leadActivitySchema,
  leadFeedbackSchema,
  type LeadActivityInput,
  type LeadFeedbackInput,
} from "@/schemas/crm.schema";
import { fromError, ok } from "@/services/api-result";
import { simulateDelay } from "@/services/fake-api";
import { getSessionUserId } from "@/stores/session-store";
import type { ApiResponse } from "@/types";
import type { CrmLeadActivity, CrmLeadFeedback } from "@/types/crm";
import {
  actorEmployeeId,
  assertCap,
  assertLeadAccess,
  ensureCatalog,
  isAdmin,
  writeHistory,
} from "@/services/crm/crm-shared";

export async function addCrmLeadActivity(
  leadId: string,
  input: LeadActivityInput
): Promise<ApiResponse<CrmLeadActivity | null>> {
  if (isApiMode()) return postCrmLeadActivity(leadId, input);
  try {
    assertCap("edit");
    await simulateDelay();
    const lead = await crmLeadRepository.findById(leadId);
    if (!lead) throw new NotFoundError("Lead not found");
    assertLeadAccess(lead);
    const parsed = leadActivitySchema.parse(input);
    const actorId = getSessionUserId() || "system";
    const now = parsed.occurredAt ?? new Date().toISOString();
    const row = enrichWithAudit(
      {
        id: createId("crm-act"),
        leadId,
        type: parsed.type,
        title: parsed.title,
        description: parsed.description ?? "",
        actorEmployeeId: actorEmployeeId(),
        occurredAt: now,
      },
      actorId
    );
    await crmLeadActivityRepository.create(row);
    await crmLeadRepository.update(lead.id, touchEntity(lead, actorId, { lastActivityAt: now })
    );
    await writeHistory({
      leadId,
      action: "activity_added",
      actorId,
      actorName: "",
      note: parsed.title,
      previousValue: null,
      newValue: parsed.type,
    });
    emitCrmUpdated();
    return ok(row);
  } catch (error) {
    return fromError(error, null);
  }
}

export async function getCrmLeadTimeline(
  leadId: string
): Promise<ApiResponse<CrmLeadActivity[]>> {
  if (isApiMode()) {
    const res = await fetchCrmLeadTimeline(leadId);
    return { ...res, data: ensureLeadTimeline(res.data) };
  }
  try {
    await simulateDelay();
    assertCap("view");
    const lead = await crmLeadRepository.findById(leadId);
    if (!lead) throw new NotFoundError("Lead not found");
    assertLeadAccess(lead);
    const items = (await crmLeadActivityRepository.findAll())
      .filter((a) => a.leadId === leadId)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
    return ok(items);
  } catch (error) {
    return fromError(error, []);
  }
}

export async function addCrmLeadFeedback(
  leadId: string,
  input: LeadFeedbackInput
): Promise<ApiResponse<CrmLeadFeedback | null>> {
  if (isApiMode()) return postCrmLeadFeedback(leadId, input);
  try {
    assertCap("edit");
    await simulateDelay();
    const lead = await crmLeadRepository.findById(leadId);
    if (!lead) throw new NotFoundError("Lead not found");
    assertLeadAccess(lead);
    const parsed = leadFeedbackSchema.parse(input);
    const actorId = getSessionUserId() || "system";
    const now = new Date().toISOString();
    const { feedbackTypes: types } = await ensureCatalog();
    const feedbackTypeId =
      parsed.feedbackTypeId ||
      types.find((x) => x.active && x.name.toLowerCase() === "other")?.id ||
      types.find((x) => x.active)?.id ||
      "";
    if (!feedbackTypeId) {
      throw new ValidationError("No feedback type available");
    }
    const callAnswered = parsed.callAnswered ?? true;
    const row = enrichWithAudit(
      {
        id: createId("crm-fb"),
        leadId,
        feedbackTypeId,
        customerFeedback: parsed.customerFeedback ?? "",
        callAnswered,
        nextAction: parsed.nextAction ?? "follow_up",
        nextFollowUpAt: parsed.nextFollowUpAt ?? null,
        notes: parsed.notes ?? "",
        recordedByEmployeeId: actorEmployeeId(),
      },
      actorId
    );
    await crmLeadFeedbackRepository.create(row);
    await crmLeadRepository.update(
      lead.id,
      touchEntity(lead, actorId, {
        nextAction: parsed.nextAction ?? lead.nextAction,
        nextFollowUpAt: parsed.nextFollowUpAt ?? lead.nextFollowUpAt,
        lastActivityAt: now,
        ...(parsed.stageId ? { stageId: parsed.stageId } : {}),
        ...(parsed.tags ? { tags: parsed.tags } : {}),
      })
    );
    const callLabel = callAnswered ? "answered" : "no_answer";
    const activity = enrichWithAudit(
      {
        id: createId("crm-act"),
        leadId,
        type: "feedback" as const,
        title: `Feedback: ${callLabel}`,
        description: parsed.customerFeedback || "",
        actorEmployeeId: actorEmployeeId(),
        occurredAt: now,
      },
      actorId
    );
    await crmLeadActivityRepository.create(activity);
    await writeHistory({
      leadId,
      action: "feedback_added",
      actorId,
      actorName: "",
      note: callLabel,
      previousValue: null,
      newValue: parsed.stageId ?? feedbackTypeId,
    });
    emitCrmUpdated();
    return ok(row);
  } catch (error) {
    return fromError(error, null);
  }
}

export async function getCrmFeedbackList(
  filters: { leadId?: string; feedbackTypeId?: string } = {}
): Promise<ApiResponse<CrmLeadFeedback[]>> {
  if (isApiMode()) {
    const res = await fetchCrmFeedbackList(filters);
    return { ...res, data: ensureLeadFeedbackList(res.data) };
  }
  try {
    await simulateDelay();
    assertCap("view");
    let items = await crmLeadFeedbackRepository.findAll();
    if (!isAdmin()) {
      const empId = actorEmployeeId();
      const leads = await crmLeadRepository.findAll();
      const mine = new Set(
        leads.filter((l) => l.ownerEmployeeId === empId).map((l) => l.id)
      );
      items = items.filter((f) => mine.has(f.leadId));
    }
    if (filters.leadId) items = items.filter((f) => f.leadId === filters.leadId);
    if (filters.feedbackTypeId) {
      items = items.filter((f) => f.feedbackTypeId === filters.feedbackTypeId);
    }
    return ok(items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  } catch (error) {
    return fromError(error, []);
  }
}

export async function getCrmActivities(
  limit = 50
): Promise<ApiResponse<CrmLeadActivity[]>> {
  if (isApiMode()) {
    const res = await fetchCrmActivities(limit);
    return { ...res, data: ensureCrmList<CrmLeadActivity>(res.data) };
  }
  try {
    await simulateDelay();
    assertCap("view");
    let items = await crmLeadActivityRepository.findAll();
    if (!isAdmin()) {
      const empId = actorEmployeeId();
      const leads = await crmLeadRepository.findAll();
      const mine = new Set(
        leads.filter((l) => l.ownerEmployeeId === empId).map((l) => l.id)
      );
      items = items.filter((a) => mine.has(a.leadId));
    }
    return ok(
      items
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
        .slice(0, limit)
    );
  } catch (error) {
    return fromError(error, []);
  }
}
