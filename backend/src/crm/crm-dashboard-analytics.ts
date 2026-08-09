/** Pure helpers assembling the CRM dashboard KPIs / attention items / insights. */
import {
  CrmLeadStatus,
  CrmNextAction,
  CrmStageCategory,
  type CrmLead,
  type CrmStage,
} from "@prisma/client";
import { startOfDay, subDays } from "date-fns";
import { INACTIVE_DAYS_THRESHOLD, round1 } from "./crm-analytics";

export function buildDashboardKpis(
  leads: CrmLead[],
  allActiveLeads: CrmLead[],
  stageById: Map<string, CrmStage>
) {
  const totalLeads = leads.length;
  const activeLeads = allActiveLeads.filter(
    (l) =>
      l.status === CrmLeadStatus.active &&
      stageById.get(l.stageId)?.category === CrmStageCategory.open
  ).length;
  const converted = allActiveLeads.filter(
    (l) =>
      stageById.get(l.stageId)?.category === CrmStageCategory.won ||
      l.convertedAt != null
  ).length;
  const lostCount = allActiveLeads.filter(
    (l) => stageById.get(l.stageId)?.category === CrmStageCategory.lost
  ).length;
  const decided = converted + lostCount;
  return {
    totalLeads,
    newLeads: totalLeads,
    activeLeads,
    converted,
    conversionRate: decided > 0 ? round1(converted / decided) : 0,
  };
}

export function computeAttentionCounts(
  allActiveLeads: CrmLead[],
  stageById: Map<string, CrmStage>,
  salesPerformance: Array<{ needsAttention: boolean }>
) {
  const now = new Date();
  const startToday = startOfDay(now);
  const inactiveCutoff = subDays(now, INACTIVE_DAYS_THRESHOLD);
  const overdue = allActiveLeads.filter(
    (l) => l.nextFollowUpAt != null && l.nextFollowUpAt < startToday
  ).length;
  const noNext = allActiveLeads.filter(
    (l) =>
      l.nextAction === CrmNextAction.none &&
      stageById.get(l.stageId)?.category === CrmStageCategory.open
  ).length;
  const inactive = allActiveLeads.filter(
    (l) =>
      l.status === CrmLeadStatus.active &&
      stageById.get(l.stageId)?.category === CrmStageCategory.open &&
      (!l.lastActivityAt || l.lastActivityAt < inactiveCutoff)
  ).length;
  const salesAttention = salesPerformance.filter((r) => r.needsAttention).length;
  return { overdue, noNext, inactive, salesAttention };
}

export function buildNeedsAttentionItems(counts: {
  overdue: number;
  noNext: number;
  inactive: number;
  salesAttention: number;
}) {
  return [
    counts.overdue
      ? {
          id: "overdue_followups",
          severity: "critical" as const,
          kind: "overdue_followups" as const,
          title: "Overdue follow-ups",
          count: counts.overdue,
          hrefFilter: { followUp: "overdue" as const },
        }
      : null,
    counts.noNext
      ? {
          id: "no_next_action",
          severity: "warning" as const,
          kind: "no_next_action" as const,
          title: "Leads without next action",
          count: counts.noNext,
        }
      : null,
    counts.inactive
      ? {
          id: "inactive_leads",
          severity: "warning" as const,
          kind: "inactive_leads" as const,
          title: "Inactive leads (14+ days)",
          count: counts.inactive,
        }
      : null,
    counts.salesAttention
      ? {
          id: "sales_attention",
          severity: "info" as const,
          kind: "sales_attention" as const,
          title: "Sales owners needing attention",
          count: counts.salesAttention,
        }
      : null,
  ].filter(Boolean);
}

export function buildInsights(input: {
  totalLeads: number;
  stageCards: Array<{ name: string; count: number; percent: number }>;
  conversionRate: number;
  overdueCount: number;
  salesPerformance: Array<{ employeeName: string; won: number }>;
  feedbackReasons: Array<{ label: string; value: number }>;
}) {
  const insights: Array<{ id: string; text: string }> = [];
  if (input.totalLeads === 0) return insights;

  const topStage = [...input.stageCards].sort((a, b) => b.count - a.count)[0];
  if (topStage && topStage.count > 0) {
    insights.push({
      id: "top_stage",
      text: `${topStage.name} holds ${topStage.count} leads (${topStage.percent}%).`,
    });
  }
  if (input.conversionRate > 0) {
    insights.push({
      id: "conversion",
      text: `Conversion rate is ${input.conversionRate}% across decided leads.`,
    });
  }
  if (input.overdueCount > 0) {
    insights.push({
      id: "overdue",
      text: `${input.overdueCount} lead(s) have overdue follow-ups.`,
    });
  }
  const topSeller = input.salesPerformance[0];
  if (topSeller && topSeller.won > 0) {
    insights.push({
      id: "top_seller",
      text: `${topSeller.employeeName} leads conversions with ${topSeller.won} won.`,
    });
  }
  const topReason = input.feedbackReasons[0];
  if (topReason) {
    insights.push({
      id: "top_feedback",
      text: `Most common feedback: ${topReason.label} (${topReason.value}).`,
    });
  }
  return insights;
}
