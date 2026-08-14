import {
  addDays,
  endOfDay,
  isAfter,
  isBefore,
  isSameDay,
  parseISO,
  startOfDay,
  startOfWeek,
  subDays,
} from "date-fns";
import type { CrmDateRangePreset, CrmDashboardFilters, CrmLead } from "@/types/crm";

export function parseMaybe(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = parseISO(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function resolveCrmRange(
  filters: Pick<CrmDashboardFilters, "range" | "dateFrom" | "dateTo">,
  now = new Date()
): { from: Date | null; to: Date } {
  const to = filters.dateTo ? endOfDay(parseISO(filters.dateTo)) : endOfDay(now);
  if (filters.dateFrom) {
    return { from: startOfDay(parseISO(filters.dateFrom)), to };
  }
  const range: CrmDateRangePreset = filters.range ?? "this_month";
  if (range === "all") return { from: null, to };
  if (range === "today") return { from: startOfDay(now), to };
  if (range === "last_7_days") return { from: startOfDay(subDays(now, 6)), to };
  if (range === "this_week")
    return { from: startOfWeek(now, { weekStartsOn: 0 }), to };
  return { from: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)), to };
}

export function leadInRange(
  lead: CrmLead,
  from: Date | null,
  to: Date
): boolean {
  const created = parseMaybe(lead.createdAt);
  if (!created) return false;
  if (from && isBefore(created, from)) return false;
  if (isAfter(created, to)) return false;
  return true;
}

export function previousPeriod(from: Date | null, to: Date): { from: Date; to: Date } {
  if (!from) {
    const span = 30;
    return {
      from: startOfDay(subDays(to, span * 2 - 1)),
      to: endOfDay(subDays(to, span)),
    };
  }
  const ms = to.getTime() - from.getTime();
  const prevTo = endOfDay(new Date(from.getTime() - 1));
  const prevFrom = startOfDay(new Date(prevTo.getTime() - ms));
  return { from: prevFrom, to: prevTo };
}

/** Follow-up urgency relative to the exact scheduled datetime. */
export function followUpBucket(
  nextFollowUpAt: string | null,
  now = new Date()
): "overdue" | "today" | "upcoming" | "none" {
  if (!nextFollowUpAt) return "none";
  const due = parseMaybe(nextFollowUpAt);
  if (!due) return "none";
  if (isBefore(due, now) || due.getTime() === now.getTime()) return "overdue";
  if (isSameDay(due, now)) return "today";
  return "upcoming";
}

/** True when the scheduled next-action time has already passed. */
export function isFollowUpOverdue(
  nextFollowUpAt: string | Date | null | undefined,
  now = new Date()
): boolean {
  if (!nextFollowUpAt) return false;
  const due =
    typeof nextFollowUpAt === "string"
      ? parseMaybe(nextFollowUpAt)
      : nextFollowUpAt;
  if (!due) return false;
  return due.getTime() <= now.getTime();
}

export function addBusinessDays(from: Date, days: number): Date {
  return addDays(from, days);
}
