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
import { leadInRange, previousPeriod, resolveCrmRange } from "@/lib/crm/date-range";
import { buildInsights, buildNeedsAttention, buildSalesPerformance } from "@/lib/crm/performance";
import { buildKpis, buildStageCards } from "@/lib/crm/stage-metrics";
import { buildConversionTrend, buildLeadsTrend } from "@/lib/crm/trends";

export function buildCrmDashboard(
  allLeads: CrmLead[],
  stages: CrmStage[],
  feedbackTypes: CrmFeedbackType[],
  feedback: CrmLeadFeedback[],
  employees: Employee[],
  filters: CrmDashboardFilters,
  scoped?: { actorEmployeeId?: string | null; isAdmin?: boolean }
): CrmDashboard {
  const { from, to } = resolveCrmRange(filters);
  let leads = allLeads.filter((l) => l.status !== "archived");
  if (!scoped?.isAdmin && scoped?.actorEmployeeId) {
    leads = leads.filter((l) => l.ownerEmployeeId === scoped.actorEmployeeId);
  }
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
  const reasonCounts = new Map<string, number>();
  for (const f of scopedFeedback) {
    const name = typeMap.get(f.feedbackTypeId)?.name ?? "Other";
    reasonCounts.set(name, (reasonCounts.get(name) ?? 0) + 1);
  }
  const feedbackReasons: CrmChartPoint[] = [...reasonCounts.entries()]
    .map(([label, value]) => ({ key: label, label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const salesPerformance = buildSalesPerformance(
    leads,
    stages,
    employees,
    scopedFeedback
  );
  const needsAttention = buildNeedsAttention(leads, salesPerformance);
  const insights = buildInsights(
    kpis,
    stageCards,
    feedbackReasons,
    salesPerformance,
    needsAttention
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
    needsAttention,
    insights,
  };
}
