/** Pure computation helpers for the CRM dashboard/performance/reports views. */
import {
  CrmLeadStatus,
  CrmNextAction,
  CrmStageCategory,
  type CrmFeedbackType,
  type CrmLead,
  type CrmStage,
} from "@prisma/client";
import { endOfDay, startOfDay, startOfWeek, subDays } from "date-fns";
import { parseDate, parseDateEnd } from "../common/mappers";

export const INACTIVE_DAYS_THRESHOLD = 14;
export const OVERDUE_ATTENTION_THRESHOLD = 3;
export const INACTIVE_ATTENTION_THRESHOLD = 3;
export const NO_NEXT_ACTION_ATTENTION_THRESHOLD = 5;
export const DEFAULT_TREND_DAYS = 29;
export const FEEDBACK_REASONS_LIMIT = 12;

/** Round a fraction (e.g. 0.5) to a 1-decimal percentage (50.0). */
export function round1(fraction: number): number {
  return Math.round(fraction * 1000) / 10;
}

export function countBy<T>(
  items: T[],
  keyFn: (item: T) => string
): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = keyFn(item);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

export function resolveDateBounds(
  query: Record<string, string | undefined>
): { from: Date | null; to: Date } {
  const now = new Date();
  let from: Date | null = null;
  let to: Date = endOfDay(now);

  if (query.dateFrom) from = startOfDay(parseDate(query.dateFrom));
  if (query.dateTo) to = parseDateEnd(query.dateTo);

  if (!from && !query.dateTo) {
    const range = query.range ?? "this_month";
    if (range === "all") {
      from = null;
    } else if (range === "today") {
      from = startOfDay(now);
    } else if (range === "last_7_days") {
      from = startOfDay(subDays(now, 6));
    } else if (range === "this_week") {
      from = startOfWeek(now, { weekStartsOn: 0 });
    } else if (range === "this_month") {
      from = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
    } else {
      from = startOfDay(subDays(now, DEFAULT_TREND_DAYS));
    }
  }
  return { from, to };
}

/** Mirror range immediately preceding [from, to] for trend comparisons. */
export function resolvePreviousPeriod(
  from: Date | null,
  to: Date
): { prevFrom: Date | null; prevTo: Date | null } {
  if (!from) return { prevFrom: null, prevTo: null };
  const spanDays = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000) + 1);
  return { prevFrom: subDays(from, spanDays), prevTo: subDays(from, 1) };
}

export type CallFeedbackRow = {
  leadId?: string | null;
  recordedByEmployeeId: string | null;
  callAnswered: boolean;
  meetingMode?: "online" | "offline" | null;
  meetingLocation?: "our_company" | "client_company" | null;
};

/**
 * Attribute Active/Inactive call feedback to the lead owner (sales pipeline),
 * falling back to the recorder when the lead/owner is missing.
 */
export function resolveCallOwnerId(
  row: CallFeedbackRow,
  leadOwnerById: Map<string, string | null | undefined>
): string | null {
  if (row.leadId) {
    const owner = leadOwnerById.get(row.leadId);
    if (owner) return owner;
  }
  return row.recordedByEmployeeId;
}

export function buildSalesPerformance(
  leads: CrmLead[],
  stages: CrmStage[],
  employees: Array<{ id: string; name: string }>,
  feedback: CallFeedbackRow[] = []
) {
  const stageById = new Map(stages.map((s) => [s.id, s]));
  const now = new Date();
  const inactiveCutoff = subDays(now, INACTIVE_DAYS_THRESHOLD);

  const byOwner = new Map<string, CrmLead[]>();
  const leadOwnerById = new Map<string, string | null | undefined>();
  for (const lead of leads) {
    leadOwnerById.set(lead.id, lead.ownerEmployeeId);
    const key = lead.ownerEmployeeId ?? "__unassigned__";
    const list = byOwner.get(key) ?? [];
    list.push(lead);
    byOwner.set(key, list);
  }

  const callsByOwner = new Map<
    string,
    {
      active: number;
      inactive: number;
      meetings: number;
      meetingsOnline: number;
      meetingsOffline: number;
    }
  >();
  for (const row of feedback) {
    const ownerId = resolveCallOwnerId(row, leadOwnerById);
    if (!ownerId) continue;
    const bucket = callsByOwner.get(ownerId) ?? {
      active: 0,
      inactive: 0,
      meetings: 0,
      meetingsOnline: 0,
      meetingsOffline: 0,
    };
    if (row.callAnswered) bucket.active += 1;
    else bucket.inactive += 1;
    if (row.meetingMode) {
      bucket.meetings += 1;
      if (row.meetingMode === "online") bucket.meetingsOnline += 1;
      else bucket.meetingsOffline += 1;
    }
    callsByOwner.set(ownerId, bucket);
  }

  const nameById = new Map(employees.map((e) => [e.id, e.name]));
  return [...byOwner.entries()]
    .filter(([id]) => id !== "__unassigned__")
    .map(([employeeId, list]) => {
      const won = list.filter(
        (l) => stageById.get(l.stageId)?.category === CrmStageCategory.won
      ).length;
      const lost = list.filter(
        (l) => stageById.get(l.stageId)?.category === CrmStageCategory.lost
      ).length;
      const active = list.filter(
        (l) =>
          l.status === CrmLeadStatus.active &&
          stageById.get(l.stageId)?.category === CrmStageCategory.open
      ).length;
      const followUps = list.filter((l) => l.nextFollowUpAt != null).length;
      const overdue = list.filter(
        (l) =>
          l.status === CrmLeadStatus.active &&
          l.nextFollowUpAt != null &&
          l.nextFollowUpAt.getTime() <= now.getTime()
      ).length;
      const withoutNextAction = list.filter(
        (l) => l.nextAction === CrmNextAction.none
      ).length;
      const inactive = list.filter(
        (l) =>
          l.status === CrmLeadStatus.active &&
          (!l.lastActivityAt || l.lastActivityAt < inactiveCutoff)
      ).length;
      const decided = won + lost;
      const calls = callsByOwner.get(employeeId) ?? {
        active: 0,
        inactive: 0,
        meetings: 0,
        meetingsOnline: 0,
        meetingsOffline: 0,
      };
      return {
        employeeId,
        employeeName: nameById.get(employeeId) ?? employeeId,
        leads: list.length,
        active,
        won,
        lost,
        conversionRate: decided > 0 ? round1(won / decided) : 0,
        followUps,
        overdue,
        withoutNextAction,
        inactive,
        activeCalls: calls.active,
        inactiveCalls: calls.inactive,
        meetings: calls.meetings,
        meetingsOnline: calls.meetingsOnline,
        meetingsOffline: calls.meetingsOffline,
        needsAttention:
          overdue >= OVERDUE_ATTENTION_THRESHOLD ||
          inactive >= INACTIVE_ATTENTION_THRESHOLD ||
          withoutNextAction >= NO_NEXT_ACTION_ATTENTION_THRESHOLD,
      };
    })
    .sort((a, b) => b.won - a.won || b.leads - a.leads);
}

export function buildStageCards(
  stages: CrmStage[],
  countsByStage: Map<string, number>,
  prevByStage: Map<string, number>,
  pipelineTotal: number
) {
  return stages.map((s) => {
    const count = countsByStage.get(s.id) ?? 0;
    const prev = prevByStage.get(s.id) ?? 0;
    const trendPercent =
      prev === 0 ? (count > 0 ? 100 : 0) : round1((count - prev) / prev);
    return {
      id: s.id,
      name: s.name,
      color: s.color,
      category: s.category,
      count,
      percent: round1(count / pipelineTotal),
      trendPercent,
    };
  });
}

/** Simpler per-employee pipeline breakdown (no trend comparison). */
export function buildPipelineBreakdown(
  stages: CrmStage[],
  countsByStage: Map<string, number>,
  total: number
) {
  return stages.map((s) => {
    const count = countsByStage.get(s.id) ?? 0;
    return {
      id: s.id,
      name: s.name,
      color: s.color,
      category: s.category,
      count,
      percent: round1(count / total),
      trendPercent: 0,
    };
  });
}

export function buildTrendSeries(
  days: Date[],
  dateKeyOf: (d: Date) => string,
  valueFor: (dateKey: string) => number
) {
  return days.map((d) => {
    const key = dateKeyOf(d);
    return { date: key, value: valueFor(key) };
  });
}

export function buildFeedbackReasons(
  feedbackCounts: Map<string, number>,
  feedbackTypes: CrmFeedbackType[]
) {
  const ftById = new Map(feedbackTypes.map((f) => [f.id, f]));
  return [...feedbackCounts.entries()]
    .map(([id, value]) => ({ key: id, label: ftById.get(id)?.name ?? id, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, FEEDBACK_REASONS_LIMIT);
}
