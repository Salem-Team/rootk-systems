import {
  isLeadOwnedByActor,
  type CrmLeadScopeOpts,
} from "@/lib/crm/lead-filters";
import type { Employee } from "@/types";
import type {
  CrmChartPoint,
  CrmDashboard,
  CrmDashboardFilters,
  CrmFeedbackType,
  CrmLead,
  CrmLeadFeedback,
  CrmStage,
} from "@/types/crm";
import {
  leadInRange,
  parseMaybe,
  previousPeriod,
  resolveCrmRange,
} from "@/lib/crm/date-range";
import {
  buildInteractionBreakdown,
  emptyInteractionBreakdown,
} from "@/lib/crm/interaction-analytics";
import {
  buildInsights,
  buildNeedsAttention,
  buildSalesPerformance,
} from "@/lib/crm/performance";
import { buildKpis, buildStageCards } from "@/lib/crm/stage-metrics";
import { buildConversionTrend, buildLeadsTrend } from "@/lib/crm/trends";

export function buildCrmDashboard(
  allLeads: CrmLead[],
  stages: CrmStage[],
  feedbackTypes: CrmFeedbackType[],
  feedback: CrmLeadFeedback[],
  employees: Employee[],
  filters: CrmDashboardFilters,
  scoped?: CrmLeadScopeOpts
): CrmDashboard {
  const { from, to } = resolveCrmRange(filters);
  let leads = allLeads.filter((l) => l.status !== "archived");
  leads = leads.filter((l) => isLeadOwnedByActor(l.ownerEmployeeId, scoped));
  if (filters.ownerEmployeeId) {
    leads = leads.filter((l) => l.ownerEmployeeId === filters.ownerEmployeeId);
  }
  if (filters.source) {
    leads = leads.filter((l) => l.source === filters.source);
  }
  if (filters.stageId) {
    leads = leads.filter((l) => l.stageId === filters.stageId);
  }
  if (filters.status) {
    leads = leads.filter((l) => l.status === filters.status);
  }

  const rangeLeads = from
    ? leads.filter((l) => leadInRange(l, from, to))
    : leads;
  const prev = previousPeriod(from, to);
  const prevLeads = leads.filter((l) => leadInRange(l, prev.from, prev.to));

  const stageCards = buildStageCards(leads, stages, prevLeads);
  const kpis = buildKpis(leads, stages, rangeLeads);
  const typeMap = new Map(feedbackTypes.map((t) => [t.id, t]));

  const scopedFeedback = feedback.filter((f) =>
    leads.some((l) => l.id === f.leadId)
  );
  const periodFeedback = scopedFeedback.filter((f) => {
    const created = parseMaybe(f.createdAt);
    if (!created) return false;
    if (from && created < from) return false;
    if (created > to) return false;
    if (
      filters.hour !== undefined &&
      filters.hour !== null &&
      !Number.isNaN(filters.hour) &&
      created.getHours() !== filters.hour
    ) {
      return false;
    }
    return true;
  });
  const reasonCounts = new Map<string, number>();
  for (const f of periodFeedback) {
    const name = typeMap.get(f.feedbackTypeId)?.name ?? "Other";
    reasonCounts.set(name, (reasonCounts.get(name) ?? 0) + 1);
  }
  const feedbackReasons: CrmChartPoint[] = [...reasonCounts.entries()]
    .map(([label, value]) => ({ key: label, label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const salesRoster = scoped?.canViewOthers
    ? employees
    : scoped?.teamOwnerIds && scoped.teamOwnerIds.length > 0
      ? employees.filter((e) => scoped.teamOwnerIds!.includes(e.id))
      : employees.filter((e) => e.id === scoped?.actorEmployeeId);
  const salesPerformance = buildSalesPerformance(
    leads,
    stages,
    salesRoster,
    periodFeedback
  );
  const needsAttention = buildNeedsAttention(leads, salesPerformance);
  const insights = buildInsights(
    kpis,
    stageCards,
    feedbackReasons,
    salesPerformance,
    needsAttention
  );
  const interactionBreakdown =
    leads.length === 0
      ? emptyInteractionBreakdown()
      : buildInteractionBreakdown(
          scopedFeedback,
          leads,
          salesRoster,
          from,
          to,
          filters.hour
        );

  return {
    kpis,
    stageCards,
    leadsByStage: stageCards.map((s) => ({
      key: s.id,
      label: s.name,
      value: s.count,
      color: s.color,
    })),
    leadsTrend: buildLeadsTrend(rangeLeads.length ? rangeLeads : leads, from, to),
    conversionTrend: buildConversionTrend(leads, stages, from, to),
    feedbackReasons,
    salesPerformance,
    interactionBreakdown,
    needsAttention,
    insights,
  };
}
