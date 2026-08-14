import type {
  CrmCallMeetingBucket,
  CrmDashboard,
  CrmInteractionBreakdown,
  CrmKpis,
  CrmSalesPerformanceRow,
} from "@/types/crm";
import { emptyInteractionBreakdown } from "@/lib/crm/interaction-analytics";

const EMPTY_KPIS: CrmKpis = {
  totalLeads: 0,
  newLeads: 0,
  activeLeads: 0,
  converted: 0,
  conversionRate: 0,
};

function ensureBucket(raw: unknown): CrmCallMeetingBucket {
  const row = (raw && typeof raw === "object" ? raw : {}) as Partial<CrmCallMeetingBucket>;
  return {
    activeCalls: Number(row.activeCalls ?? 0),
    inactiveCalls: Number(row.inactiveCalls ?? 0),
    meetings: Number(row.meetings ?? 0),
    meetingsOnline: Number(row.meetingsOnline ?? 0),
    meetingsOffline: Number(row.meetingsOffline ?? 0),
    meetingsOurCompany: Number(row.meetingsOurCompany ?? 0),
    meetingsClientCompany: Number(row.meetingsClientCompany ?? 0),
  };
}

export function ensureInteractionBreakdown(
  raw: unknown
): CrmInteractionBreakdown {
  const base = emptyInteractionBreakdown();
  if (!raw || typeof raw !== "object") return base;
  const row = raw as Partial<CrmInteractionBreakdown>;
  return {
    totals: ensureBucket(row.totals),
    byDay: Array.isArray(row.byDay)
      ? row.byDay.map((d) => ({
          date: String(d.date ?? ""),
          label: String(d.label ?? d.date ?? ""),
          ...ensureBucket(d),
        }))
      : [],
    byHour: Array.isArray(row.byHour)
      ? row.byHour.map((h) => ({
          hour: Number(h.hour ?? 0),
          label: String(
            h.label ?? `${String(h.hour ?? 0).padStart(2, "0")}:00`
          ),
          ...ensureBucket(h),
        }))
      : [],
    byClient: Array.isArray(row.byClient)
      ? row.byClient.map((c) => ({
          leadId: String(c.leadId ?? ""),
          leadName: String(c.leadName ?? ""),
          companyName: String(c.companyName ?? ""),
          ownerEmployeeId: c.ownerEmployeeId ?? null,
          ownerEmployeeName: String(c.ownerEmployeeName ?? ""),
          date: String(c.date ?? ""),
          contactsThatDay: Number(c.contactsThatDay ?? 0),
          contactsTotal: Number(c.contactsTotal ?? 0),
          ...ensureBucket(c),
        }))
      : [],
  };
}

export function emptyCrmDashboard(): CrmDashboard {
  return {
    kpis: { ...EMPTY_KPIS },
    stageCards: [],
    leadsByStage: [],
    leadsTrend: [],
    conversionTrend: [],
    feedbackReasons: [],
    salesPerformance: [],
    interactionBreakdown: emptyInteractionBreakdown(),
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
        meetings: Number(item.meetings ?? 0),
        meetingsOnline: Number(item.meetingsOnline ?? 0),
        meetingsOffline: Number(item.meetingsOffline ?? 0),
      };
    }),
    interactionBreakdown: ensureInteractionBreakdown(row.interactionBreakdown),
    needsAttention: Array.isArray(row.needsAttention) ? row.needsAttention : [],
    insights: Array.isArray(row.insights) ? row.insights : [],
  };
}
