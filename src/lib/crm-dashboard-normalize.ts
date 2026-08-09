import type { CrmDashboard, CrmKpis, CrmSalesPerformanceRow } from "@/types/crm";

const EMPTY_KPIS: CrmKpis = {
  totalLeads: 0,
  newLeads: 0,
  activeLeads: 0,
  converted: 0,
  conversionRate: 0,
};

export function emptyCrmDashboard(): CrmDashboard {
  return {
    kpis: { ...EMPTY_KPIS },
    stageCards: [],
    leadsByStage: [],
    leadsTrend: [],
    conversionTrend: [],
    feedbackReasons: [],
    salesPerformance: [],
    needsAttention: [],
    insights: [],
  };
}

/**
 * Normalize any CRM dashboard payload (flat or nested `{ charts }`) into a
 * complete `CrmDashboard` so UI never reads `.length` on undefined arrays.
 */
export function ensureCrmDashboard(raw: unknown): CrmDashboard {
  const base = emptyCrmDashboard();
  if (!raw || typeof raw !== "object") return base;

  const row = raw as Partial<CrmDashboard> & {
    charts?: Partial<
      Pick<
        CrmDashboard,
        | "leadsByStage"
        | "leadsTrend"
        | "conversionTrend"
        | "feedbackReasons"
        | "salesPerformance"
      >
    >;
  };
  const charts = row.charts ?? {};
  const kpis = row.kpis;

  return {
    kpis: {
      totalLeads: kpis?.totalLeads ?? 0,
      newLeads: kpis?.newLeads ?? 0,
      activeLeads: kpis?.activeLeads ?? 0,
      converted: kpis?.converted ?? 0,
      conversionRate: kpis?.conversionRate ?? 0,
    },
    stageCards: Array.isArray(row.stageCards) ? row.stageCards : [],
    leadsByStage: Array.isArray(row.leadsByStage)
      ? row.leadsByStage
      : Array.isArray(charts.leadsByStage)
        ? charts.leadsByStage
        : [],
    leadsTrend: Array.isArray(row.leadsTrend)
      ? row.leadsTrend
      : Array.isArray(charts.leadsTrend)
        ? charts.leadsTrend
        : [],
    conversionTrend: Array.isArray(row.conversionTrend)
      ? row.conversionTrend
      : Array.isArray(charts.conversionTrend)
        ? charts.conversionTrend
        : [],
    feedbackReasons: Array.isArray(row.feedbackReasons)
      ? row.feedbackReasons
      : Array.isArray(charts.feedbackReasons)
        ? charts.feedbackReasons
        : [],
    salesPerformance: (
      Array.isArray(row.salesPerformance)
        ? row.salesPerformance
        : Array.isArray(charts.salesPerformance)
          ? charts.salesPerformance
          : []
    ).map((perf) => {
      const item = perf as CrmSalesPerformanceRow;
      return {
        ...item,
        activeCalls: Number(item.activeCalls ?? 0),
        inactiveCalls: Number(item.inactiveCalls ?? 0),
      };
    }),
    needsAttention: Array.isArray(row.needsAttention) ? row.needsAttention : [],
    insights: Array.isArray(row.insights) ? row.insights : [],
  };
}
