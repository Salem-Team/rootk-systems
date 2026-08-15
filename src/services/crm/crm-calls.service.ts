import {
  fetchCrmLeadMatch,
  fetchCrmPhoneDuplicates,
  postCrmLeadCall,
} from "@/api/crm.api";
import { isApiMode } from "@/lib/env";
import { canonicalPhoneOrNull } from "@/lib/phone-normalize";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { leadCallSchema, type LeadCallInput } from "@/schemas/crm.schema";
import { fromError, ok } from "@/services/api-result";
import { simulateDelay } from "@/services/fake-api";
import { crmLeadRepository } from "@/repositories/crm.repository";
import type { ApiResponse } from "@/types";
import type {
  CrmCall,
  CrmLead,
  CrmPhoneDuplicateGroup,
  CrmPhoneMatchResult,
} from "@/types/crm";
import { assertCap, assertLeadAccess, canViewOthersCrm } from "@/services/crm/crm-shared";
import { getWorkEmployeeId } from "@/stores/session-store";
import { addCrmLeadFeedback } from "@/services/crm/crm-activities.service";

const localCallsByExternalId = new Map<string, CrmCall>();

function scopeVisible(lead: CrmLead, canViewOthers: boolean, empId: string): boolean {
  if (canViewOthers) return true;
  return Boolean(empId) && lead.ownerEmployeeId === empId;
}

export async function matchCrmLeadByPhone(
  phone: string,
  opts?: { canViewOthers?: boolean }
): Promise<ApiResponse<CrmPhoneMatchResult | null>> {
  if (isApiMode()) return fetchCrmLeadMatch(phone);
  try {
    assertCap("view");
    await simulateDelay();
    const canonical = canonicalPhoneOrNull(phone);
    if (!canonical) throw new ValidationError("Not a valid Egyptian mobile number");
    const all = await crmLeadRepository.findAll();
    const empId = getWorkEmployeeId();
    const canViewOthers = opts?.canViewOthers ?? canViewOthersCrm();
    const match = all.find(
      (lead) => canonicalPhoneOrNull(lead.phoneNormalized || lead.phone) === canonical
    );
    if (!match) return ok({ lead: null, ownedByOther: false });
    if (!scopeVisible(match, canViewOthers, empId)) {
      return ok({ lead: null, ownedByOther: true });
    }
    return ok({ lead: match, ownedByOther: false });
  } catch (error) {
    return fromError(error, null);
  }
}

export async function getCrmPhoneDuplicates(opts?: {
  canViewOthers?: boolean;
}): Promise<ApiResponse<CrmPhoneDuplicateGroup[]>> {
  if (isApiMode()) return fetchCrmPhoneDuplicates();
  try {
    assertCap("view");
    await simulateDelay();
    const all = await crmLeadRepository.findAll();
    const empId = getWorkEmployeeId();
    const visible = all.filter((lead) =>
      scopeVisible(lead, opts?.canViewOthers ?? canViewOthersCrm(), empId)
    );
    const groups = new Map<string, CrmLead[]>();
    for (const lead of visible) {
      const key = lead.phoneNormalized || canonicalPhoneOrNull(lead.phone);
      if (!key) continue;
      const list = groups.get(key) ?? [];
      list.push(lead);
      groups.set(key, list);
    }
    const result: CrmPhoneDuplicateGroup[] = [...groups.entries()]
      .filter(([, leads]) => leads.length > 1)
      .map(([phoneNormalized, leads]) => ({
        phoneNormalized,
        count: leads.length,
        leads: leads.map((lead) => ({
          id: lead.id,
          name: lead.name,
          phone: lead.phone,
          phoneNormalized: lead.phoneNormalized ?? null,
          ownerEmployeeId: lead.ownerEmployeeId,
          stageId: lead.stageId,
        })),
      }));
    return ok(result);
  } catch (error) {
    return fromError(error, []);
  }
}

export async function recordCrmLeadCall(
  leadId: string,
  input: LeadCallInput
): Promise<ApiResponse<CrmCall | null>> {
  if (isApiMode()) return postCrmLeadCall(leadId, input);
  try {
    assertCap("edit");
    await simulateDelay();
    const lead = await crmLeadRepository.findById(leadId);
    if (!lead) throw new NotFoundError("Lead not found");
    assertLeadAccess(lead);
    const parsed = leadCallSchema.parse(input);
    if (parsed.externalCallId) {
      const replay = localCallsByExternalId.get(parsed.externalCallId);
      if (replay) return ok(replay);
    }
    const answered = parsed.status === "answered";
    await addCrmLeadFeedback(leadId, {
      callAnswered: answered,
      notes: parsed.notes ?? "",
      customerFeedback: parsed.notes ?? "",
      nextAction: parsed.nextAction ?? "none",
      nextFollowUpAt: parsed.nextFollowUpAt,
    });
    const now = new Date().toISOString();
    const recorded: CrmCall = {
      id: parsed.externalCallId ?? `local-call-${now}`,
      leadId,
      employeeId: getWorkEmployeeId() || null,
      phoneNumber: parsed.phoneNumber ?? lead.phone,
      phoneNormalized: lead.phoneNormalized ?? canonicalPhoneOrNull(lead.phone),
      direction: parsed.direction ?? "outgoing",
      status: parsed.status,
      startedAt: parsed.startedAt ?? now,
      endedAt: parsed.endedAt ?? now,
      durationSeconds: parsed.durationSeconds ?? null,
      source: parsed.source ?? "web",
      externalCallId: parsed.externalCallId ?? null,
      notes: parsed.notes ?? "",
      activityId: null,
      feedbackId: null,
      createdAt: now,
      updatedAt: now,
    };
    if (recorded.externalCallId) {
      localCallsByExternalId.set(recorded.externalCallId, recorded);
    }
    return ok(recorded);
  } catch (error) {
    return fromError(error, null);
  }
}

export function duplicateFromError(error: {
  code?: string;
  details?: unknown;
}): { existingLead?: CrmPhoneMatchResult["lead"]; ownedByOther?: boolean } | null {
  const details = error.details;
  if (!details || typeof details !== "object") return null;
  const row = details as {
    code?: string;
    existingLead?: CrmLead | null;
    ownedByOther?: boolean;
  };
  if (row.code !== "PHONE_DUPLICATE" && !row.existingLead && !row.ownedByOther) {
    return null;
  }
  return {
    existingLead: row.existingLead ?? undefined,
    ownedByOther: Boolean(row.ownedByOther),
  };
}
