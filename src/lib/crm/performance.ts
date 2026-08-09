import { isBefore, startOfDay, subDays } from "date-fns";
import type { Employee } from "@/types";
import type {
  CrmAttentionItem,
  CrmChartPoint,
  CrmInsight,
  CrmKpis,
  CrmLead,
  CrmLeadFeedback,
  CrmSalesPerformanceRow,
  CrmStage,
  CrmStageCard,
} from "@/types/crm";
import { parseMaybe } from "@/lib/crm/date-range";
import { isLost, isWon, stageMap } from "@/lib/crm/stage-metrics";

export function buildSalesPerformance(
  leads: CrmLead[],
  stages: CrmStage[],
  employees: Employee[],
  feedback: CrmLeadFeedback[] = []
): CrmSalesPerformanceRow[] {
  const map = stageMap(stages);
  const now = new Date();
  const todayStart = startOfDay(now);
  const inactiveCutoff = subDays(now, 7);

  const ownerIds = new Set(
    leads.map((l) => l.ownerEmployeeId).filter(Boolean) as string[]
  );
  const salesEmployees = employees.filter(
    (e) =>
      e.status === "active" &&
      (e.department === "Sales" || ownerIds.has(e.id))
  );

  return salesEmployees
    .map((emp) => {
      const mine = leads.filter((l) => l.ownerEmployeeId === emp.id);
      const mineCalls = feedback.filter(
        (f) => f.recordedByEmployeeId === emp.id
      );
      const won = mine.filter((l) => isWon(map.get(l.stageId))).length;
      const lost = mine.filter((l) => isLost(map.get(l.stageId))).length;
      const closed = won + lost;
      const overdue = mine.filter((l) => {
        const due = parseMaybe(l.nextFollowUpAt);
        return (
          l.status === "active" && due !== null && isBefore(due, todayStart)
        );
      }).length;
      const withoutNextAction = mine.filter(
        (l) =>
          l.status === "active" &&
          (l.nextAction === "none" || !l.nextFollowUpAt)
      ).length;
      const inactive = mine.filter((l) => {
        if (l.status !== "active") return false;
        const last = parseMaybe(l.lastActivityAt) ?? parseMaybe(l.updatedAt);
        return last ? isBefore(last, inactiveCutoff) : true;
      }).length;
      const followUps = mine.filter(
        (l) => l.status === "active" && l.nextFollowUpAt
      ).length;
      const needsAttention =
        overdue >= 3 || withoutNextAction >= 3 || inactive >= 3;

      return {
        employeeId: emp.id,
        employeeName: emp.name,
        leads: mine.length,
        active: mine.filter((l) => l.status === "active").length,
        won,
        lost,
        conversionRate:
          closed > 0 ? Math.round((won / closed) * 1000) / 10 : 0,
        followUps,
        overdue,
        withoutNextAction,
        inactive,
        activeCalls: mineCalls.filter((f) => f.callAnswered !== false).length,
        inactiveCalls: mineCalls.filter((f) => f.callAnswered === false).length,
        needsAttention,
      };
    })
    .sort((a, b) => b.won - a.won || b.leads - a.leads);
}

export function buildNeedsAttention(
  leads: CrmLead[],
  performance: CrmSalesPerformanceRow[]
): CrmAttentionItem[] {
  const now = new Date();
  const todayStart = startOfDay(now);
  const inactiveCutoff = subDays(now, 7);

  const overdue = leads.filter((l) => {
    const due = parseMaybe(l.nextFollowUpAt);
    return l.status === "active" && due && isBefore(due, todayStart);
  }).length;

  const noNext = leads.filter(
    (l) =>
      l.status === "active" && (l.nextAction === "none" || !l.nextFollowUpAt)
  ).length;

  const inactive = leads.filter((l) => {
    if (l.status !== "active") return false;
    const last = parseMaybe(l.lastActivityAt) ?? parseMaybe(l.updatedAt);
    return last ? isBefore(last, inactiveCutoff) : true;
  }).length;

  const salesNeed = performance.filter((p) => p.needsAttention).length;

  const items: CrmAttentionItem[] = [];
  if (overdue > 0) {
    items.push({
      id: "overdue",
      severity: "critical",
      kind: "overdue_followups",
      title: `${overdue} overdue follow-up${overdue === 1 ? "" : "s"}`,
      count: overdue,
      hrefFilter: { followUp: "overdue", status: "active" },
    });
  }
  if (noNext > 0) {
    items.push({
      id: "no-next",
      severity: "warning",
      kind: "no_next_action",
      title: `${noNext} lead${noNext === 1 ? "" : "s"} without next action`,
      count: noNext,
      hrefFilter: { followUp: "none", status: "active" },
    });
  }
  if (inactive > 0) {
    items.push({
      id: "inactive",
      severity: "warning",
      kind: "inactive_leads",
      title: `${inactive} inactive lead${inactive === 1 ? "" : "s"} (7+ days)`,
      count: inactive,
      hrefFilter: { status: "active" },
    });
  }
  if (salesNeed > 0) {
    items.push({
      id: "sales",
      severity: "info",
      kind: "sales_attention",
      title: `${salesNeed} sales rep${salesNeed === 1 ? "" : "s"} need attention`,
      count: salesNeed,
    });
  }
  return items;
}

export function buildInsights(
  kpis: CrmKpis,
  stageCards: CrmStageCard[],
  feedbackReasons: CrmChartPoint[],
  performance: CrmSalesPerformanceRow[],
  attention: CrmAttentionItem[]
): CrmInsight[] {
  const insights: CrmInsight[] = [];
  const qualified = stageCards.find((s) =>
    s.name.toLowerCase().includes("qualif")
  );
  if (qualified && qualified.trendPercent !== 0) {
    insights.push({
      id: "qualified-trend",
      text: `Qualified leads ${qualified.trendPercent > 0 ? "increased" : "decreased"} ${Math.abs(qualified.trendPercent)}% vs prior period.`,
    });
  }
  if (feedbackReasons[0]) {
    insights.push({
      id: "top-feedback",
      text: `${feedbackReasons[0].label} is the most common feedback reason (${feedbackReasons[0].value}).`,
    });
  }
  const topConv = [...performance].sort(
    (a, b) => b.conversionRate - a.conversionRate
  )[0];
  if (topConv && topConv.conversionRate > 0) {
    insights.push({
      id: "top-converter",
      text: `${topConv.employeeName} has the highest conversion rate (${topConv.conversionRate}%).`,
    });
  }
  const inactive = attention.find((a) => a.kind === "inactive_leads");
  if (inactive) {
    insights.push({
      id: "inactive",
      text: `${inactive.count} leads have been inactive for more than 7 days.`,
    });
  }
  if (kpis.conversionRate > 0) {
    insights.push({
      id: "conversion",
      text: `Overall conversion rate is ${kpis.conversionRate}%.`,
    });
  }
  return insights.slice(0, 4);
}
