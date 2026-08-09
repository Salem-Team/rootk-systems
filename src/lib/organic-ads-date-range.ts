import {
  endOfWeek,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";
import type { DateRangePreset } from "@/types/organic-ads";

export function resolveDateRange(
  range: DateRangePreset,
  now = new Date()
): { from: Date | null; to: Date } {
  const to = now;
  if (range === "all") return { from: null, to };
  if (range === "last_7_days") {
    return { from: startOfDay(subDays(now, 6)), to };
  }
  if (range === "this_month") {
    return { from: startOfMonth(now), to };
  }
  // this_week — week starts Sunday (matches ROOTK schedule defaults)
  return {
    from: startOfWeek(now, { weekStartsOn: 0 }),
    to: endOfWeek(now, { weekStartsOn: 0 }),
  };
}

export function isInRange(
  iso: string,
  range: DateRangePreset,
  now = new Date()
): boolean {
  const { from, to } = resolveDateRange(range, now);
  if (!from) return true;
  const d = parseISO(iso);
  return isWithinInterval(d, { start: from, end: to });
}
