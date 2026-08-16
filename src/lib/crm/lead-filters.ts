import { endOfDay, isAfter, isSameDay } from "date-fns";
import type { CrmLead, CrmLeadFilters } from "@/types/crm";
import {
  isFollowUpOverdue,
  leadInRange,
  parseMaybe,
  resolveCrmRange,
} from "@/lib/crm/date-range";
import { extractHandle, looksLikeHandle } from "@/lib/crm/contact-identity";
import { canonicalPhoneOrNull } from "@/lib/phone-normalize";

export type CrmLeadScopeOpts = {
  actorEmployeeId?: string | null;
  canViewOthers?: boolean;
  teamOwnerIds?: string[];
};

function isInCrmScope(
  ownerEmployeeId: string | null | undefined,
  opts?: CrmLeadScopeOpts
): boolean {
  if (opts?.canViewOthers) return true;
  if (opts?.teamOwnerIds && opts.teamOwnerIds.length > 0) {
    return Boolean(
      ownerEmployeeId && opts.teamOwnerIds.includes(ownerEmployeeId)
    );
  }
  const actorId = opts?.actorEmployeeId?.trim() ?? "";
  return Boolean(actorId) && ownerEmployeeId === actorId;
}

export function canFilterCrmByOwner(flags: {
  canAssign?: boolean;
  canViewOthers?: boolean;
  canViewTeam?: boolean;
}): boolean {
  return Boolean(flags.canViewOthers || flags.canViewTeam || flags.canAssign);
}

export function isLeadOwnedByActor(
  ownerEmployeeId: string | null | undefined,
  opts?: CrmLeadScopeOpts
): boolean {
  return isInCrmScope(ownerEmployeeId, opts);
}

export function filterLeads(
  leads: CrmLead[],
  filters: CrmLeadFilters,
  opts?: CrmLeadScopeOpts
): CrmLead[] {
  const now = new Date();
  const todayEnd = endOfDay(now);
  const q = filters.search?.trim().toLowerCase() ?? "";

  return leads.filter((lead) => {
    if (!isInCrmScope(lead.ownerEmployeeId, opts)) return false;
    if (
      (opts?.canViewOthers || (opts?.teamOwnerIds && opts.teamOwnerIds.length > 0)) &&
      filters.ownerEmployeeId &&
      lead.ownerEmployeeId !== filters.ownerEmployeeId
    )
      return false;
    if (filters.stageId && lead.stageId !== filters.stageId) return false;
    if (filters.subStageId && lead.subStageId !== filters.subStageId)
      return false;
    if (filters.status && lead.status !== filters.status) return false;
    if (filters.source && lead.source !== filters.source) return false;
    if (filters.tag && !lead.tags.includes(filters.tag)) return false;

    if (filters.followUp === "none") {
      if (lead.status !== "active") return false;
      if (!(lead.nextAction === "none" || !lead.nextFollowUpAt)) return false;
    } else if (filters.followUp === "overdue") {
      if (lead.status !== "active" || !isFollowUpOverdue(lead.nextFollowUpAt, now))
        return false;
    } else if (filters.followUp === "today") {
      const due = parseMaybe(lead.nextFollowUpAt);
      if (
        !due ||
        lead.status !== "active" ||
        !isSameDay(due, now) ||
        isFollowUpOverdue(due, now)
      )
        return false;
    } else if (filters.followUp === "upcoming") {
      const due = parseMaybe(lead.nextFollowUpAt);
      if (!due || !isAfter(due, todayEnd) || lead.status !== "active")
        return false;
    }

    if (q) {
      const canonical = canonicalPhoneOrNull(filters.search);
      const hay = [
        lead.name,
        lead.phone,
        lead.email,
        lead.companyName,
        lead.id,
      ]
        .join(" ")
        .toLowerCase();
      const qDigits = q.replace(/\D/g, "");
      const phoneDigits = (lead.phoneNormalized || lead.phone).replace(/\D/g, "");
      const digitHit = qDigits.length >= 3 && phoneDigits.includes(qDigits);
      const exactPhone =
        Boolean(canonical) &&
        (lead.phoneNormalized || canonicalPhoneOrNull(lead.phone)) === canonical;
      const handle = extractHandle(q);
      const handleHit =
        looksLikeHandle(q) &&
        Boolean(handle) &&
        ((lead.phoneNormalized || "").toLowerCase().includes(`:${handle}`) ||
          lead.phone.toLowerCase().includes(handle));
      const extraHay = (lead.contacts ?? [])
        .flatMap((row) => [row.phone, row.phoneNormalized ?? ""])
        .join(" ")
        .toLowerCase();
      const extraDigits = (lead.contacts ?? [])
        .map((row) => (row.phoneNormalized || row.phone).replace(/\D/g, ""))
        .join(" ");
      const extraHit =
        extraHay.includes(q) ||
        (qDigits.length >= 3 && extraDigits.includes(qDigits)) ||
        (Boolean(canonical) &&
          (lead.contacts ?? []).some(
            (row) =>
              (row.phoneNormalized || canonicalPhoneOrNull(row.phone)) ===
              canonical
          )) ||
        (looksLikeHandle(q) &&
          Boolean(handle) &&
          extraHay.includes(handle));
      if (!hay.includes(q) && !exactPhone && !digitHit && !handleHit && !extraHit)
        return false;
    }

    if (filters.dateFrom || filters.dateTo || filters.range) {
      const { from, to } = resolveCrmRange(filters);
      if (!leadInRange(lead, from, to)) return false;
    }

    return true;
  });
}
