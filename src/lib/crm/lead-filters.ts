import { endOfDay, isAfter, isSameDay } from "date-fns";
import type { CrmLead, CrmLeadFilters } from "@/types/crm";
import {
  isFollowUpOverdue,
  leadInRange,
  parseMaybe,
  resolveCrmRange,
} from "@/lib/crm/date-range";
import { canonicalPhoneOrNull } from "@/lib/phone-normalize";

export function isLeadOwnedByActor(
  ownerEmployeeId: string | null | undefined,
  opts?: { actorEmployeeId?: string | null; isAdmin?: boolean }
): boolean {
  if (opts?.isAdmin) return true;
  const actorId = opts?.actorEmployeeId?.trim() ?? "";
  return Boolean(actorId) && ownerEmployeeId === actorId;
}

export function filterLeads(
  leads: CrmLead[],
  filters: CrmLeadFilters,
  opts?: { actorEmployeeId?: string | null; isAdmin?: boolean }
): CrmLead[] {
  const now = new Date();
  const todayEnd = endOfDay(now);
  const q = filters.search?.trim().toLowerCase() ?? "";

  return leads.filter((lead) => {
    if (!isLeadOwnedByActor(lead.ownerEmployeeId, opts)) return false;
    if (
      opts?.isAdmin &&
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
      const phoneHit = canonical
        ? (lead.phoneNormalized || canonicalPhoneOrNull(lead.phone)) ===
          canonical
        : hay.includes(q);
      if (!phoneHit && !hay.includes(q)) return false;
    }

    if (filters.dateFrom || filters.dateTo || filters.range) {
      const { from, to } = resolveCrmRange(filters);
      if (!leadInRange(lead, from, to)) return false;
    }

    return true;
  });
}
