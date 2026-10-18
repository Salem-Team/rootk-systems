import { filterLeads, type CrmLeadScopeOpts } from "@/lib/crm/lead-filters";
import type { CrmLead, CrmLeadFilters } from "@/types/crm";

export type CrmLeadFilterFacets = {
  total: number;
  lost: number;
  byStage: Record<string, number>;
  byStatus: Record<string, number>;
  bySource: Record<string, number>;
  byOwner: Record<string, number>;
  byFollowUp: Record<string, number>;
  byLossReason: Record<string, number>;
};

function countBy(
  leads: CrmLead[],
  keyOf: (lead: CrmLead) => string | null | undefined
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const lead of leads) {
    const key = keyOf(lead);
    if (!key) continue;
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

function without(
  filters: CrmLeadFilters,
  keys: Array<keyof CrmLeadFilters>
): CrmLeadFilters {
  const next = { ...filters };
  for (const key of keys) delete next[key];
  return next;
}

/**
 * Facet counts for the leads filter bar.
 * Each dimension is counted after every other active filter is applied.
 */
export function computeLeadFilterFacets(
  leads: CrmLead[],
  filters: CrmLeadFilters,
  opts?: CrmLeadScopeOpts
): CrmLeadFilterFacets {
  const base = filterLeads(
    leads,
    without(filters, [
      "stageId",
      "status",
      "source",
      "ownerEmployeeId",
      "followUp",
      "lossReason",
      "excludeLost",
      "page",
      "pageSize",
      "sort",
      "order",
    ]),
    opts
  );

  const forStage = filterLeads(base, without(filters, ["stageId", "page", "pageSize"]), opts);
  const forStatus = filterLeads(base, without(filters, ["status", "page", "pageSize"]), opts);
  const forSource = filterLeads(base, without(filters, ["source", "page", "pageSize"]), opts);
  const forOwner = filterLeads(
    base,
    without(filters, ["ownerEmployeeId", "page", "pageSize"]),
    opts
  );
  const forFollowUp = filterLeads(
    base,
    without(filters, ["followUp", "page", "pageSize"]),
    opts
  );
  const forLoss = filterLeads(
    base,
    {
      ...without(filters, [
        "lossReason",
        "stageId",
        "excludeLost",
        "page",
        "pageSize",
      ]),
      excludeLost: undefined,
    },
    opts
  );

  const lostStageIds = opts?.lostStageIds ?? new Set<string>();
  const lostLeads = forLoss.filter((lead) => lostStageIds.has(lead.stageId));
  const matched = filterLeads(base, without(filters, ["page", "pageSize"]), opts);

  return {
    total: matched.length,
    lost: lostLeads.length,
    byStage: countBy(forStage, (lead) => lead.stageId),
    byStatus: countBy(forStatus, (lead) => lead.status),
    bySource: countBy(forSource, (lead) => lead.source),
    byOwner: countBy(forOwner, (lead) => lead.ownerEmployeeId || "__unassigned__"),
    byFollowUp: (() => {
      const today = filterLeads(forFollowUp, { ...filters, followUp: "today" }, opts).length;
      const upcoming = filterLeads(
        forFollowUp,
        { ...filters, followUp: "upcoming" },
        opts
      ).length;
      const overdue = filterLeads(
        forFollowUp,
        { ...filters, followUp: "overdue" },
        opts
      ).length;
      const none = filterLeads(forFollowUp, { ...filters, followUp: "none" }, opts).length;
      return { today, upcoming, overdue, none, all: forFollowUp.length };
    })(),
    byLossReason: {
      any: lostLeads.length,
      ...countBy(lostLeads, (lead) => lead.lossReasonTypeId || "__unknown__"),
    },
  };
}

export function emptyLeadFilterFacets(): CrmLeadFilterFacets {
  return {
    total: 0,
    lost: 0,
    byStage: {},
    byStatus: {},
    bySource: {},
    byOwner: {},
    byFollowUp: {},
    byLossReason: {},
  };
}
