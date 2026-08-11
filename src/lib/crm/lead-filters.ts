import { endOfDay, isAfter, isBefore, isSameDay, startOfDay } from "date-fns";
import type { CrmLead, CrmLeadFilters } from "@/types/crm";
import { leadInRange, parseMaybe, resolveCrmRange } from "@/lib/crm/date-range";

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
  const todayStart = startOfDay(now);
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
      const due = parseMaybe(lead.nextFollowUpAt);
      if (!due || !isBefore(due, todayStart) || lead.status !== "active")
        return false;
    } else if (filters.followUp === "today") {
      const due = parseMaybe(lead.nextFollowUpAt);
      if (!due || !isSameDay(due, now) || lead.status !== "active") return false;
    } else if (filters.followUp === "upcoming") {
      const due = parseMaybe(lead.nextFollowUpAt);
      if (!due || !isAfter(due, todayEnd) || lead.status !== "active")
        return false;
    }

    if (q) {
      const hay = [
        lead.name,
        lead.phone,
        lead.email,
        lead.companyName,
        lead.id,
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }

    if (filters.dateFrom || filters.dateTo || filters.range) {
      const { from, to } = resolveCrmRange(filters);
      if (!leadInRange(lead, from, to)) return false;
    }

    return true;
  });
}
