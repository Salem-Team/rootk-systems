import { endOfDay, isAfter, isSameDay } from "date-fns";
import type { CrmLead, CrmLeadFilters } from "@/types/crm";
import {
  isFollowUpOverdue,
  leadInRange,
  parseMaybe,
  resolveCrmRange,
} from "@/lib/crm/date-range";
import { leadMatchesSearch } from "@/lib/crm/lead-search";

export type CrmLeadScopeOpts = {
  actorEmployeeId?: string | null;
  canViewOthers?: boolean;
  teamOwnerIds?: string[];
  /** Feedback, stage, owner, and business-type text keyed by lead id. */
  searchTextByLeadId?: ReadonlyMap<string, string>;
  /**
   * Admin search with no status filter: keep soft-deleted rows in the result.
   * Everyone else never sees `deletedAt`.
   */
  includeDeletedMatches?: boolean;
};

function matchesLeadDeletionFilter(
  lead: CrmLead,
  filters: CrmLeadFilters,
  opts?: CrmLeadScopeOpts
): boolean {
  const deleted = Boolean(lead.deletedAt);
  if (filters.status === "deleted") return deleted;
  if (deleted && !opts?.includeDeletedMatches) return false;
  if (filters.status && lead.status !== filters.status) return false;
  return true;
}

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

/**
 * Drop owner filters the actor is not allowed to use (anti-peek).
 * Sales scoped to self: foreign owner ids are ignored so the list stays own-leads.
 */
function resolveEffectiveOwnerFilter(
  requested: string | undefined,
  opts?: CrmLeadScopeOpts
): string | undefined {
  if (!requested) return undefined;
  if (requested === "__unassigned__") {
    return opts?.canViewOthers ? requested : undefined;
  }
  if (opts?.canViewOthers) return requested;
  if (opts?.teamOwnerIds && opts.teamOwnerIds.length > 0) {
    return opts.teamOwnerIds.includes(requested) ? requested : undefined;
  }
  const actorId = opts?.actorEmployeeId?.trim() ?? "";
  return requested === actorId ? requested : undefined;
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
  const ownerFilter = resolveEffectiveOwnerFilter(filters.ownerEmployeeId, opts);

  return leads.filter((lead) => {
    if (!isInCrmScope(lead.ownerEmployeeId, opts)) return false;
    if (ownerFilter === "__unassigned__") {
      if (lead.ownerEmployeeId) return false;
    } else if (ownerFilter && lead.ownerEmployeeId !== ownerFilter) {
      return false;
    }
    if (filters.stageId && lead.stageId !== filters.stageId) return false;
    if (filters.subStageId && lead.subStageId !== filters.subStageId)
      return false;
    if (!matchesLeadDeletionFilter(lead, filters, opts)) return false;
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

    if (
      q &&
      !leadMatchesSearch(
        lead,
        filters.search ?? "",
        opts?.searchTextByLeadId?.get(lead.id) ?? ""
      )
    ) {
      return false;
    }

    if (filters.dateFrom || filters.dateTo || filters.range) {
      const { from, to } = resolveCrmRange(filters);
      if (!leadInRange(lead, from, to)) return false;
    }

    return true;
  });
}

/** True when two lead filter objects would produce the same query (avoids reload loops). */
export function sameLeadFilters(
  a: CrmLeadFilters,
  b: CrmLeadFilters
): boolean {
  const keys: Array<keyof CrmLeadFilters> = [
    "page",
    "pageSize",
    "search",
    "stageId",
    "subStageId",
    "source",
    "status",
    "ownerEmployeeId",
    "tag",
    "followUp",
    "sort",
    "order",
    "range",
    "dateFrom",
    "dateTo",
  ];
  for (const key of keys) {
    const left = a[key] ?? undefined;
    const right = b[key] ?? undefined;
    const norm = (v: unknown) => (v === "" ? undefined : v);
    if (norm(left) !== norm(right)) return false;
  }
  return true;
}

