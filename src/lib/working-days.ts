import { addDays, formatISO, parseISO } from "date-fns";

const WEEKDAY = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

/** Inclusive count of days in [start, end] that fall on `workingDays`. */
export function countWorkingDaysInRange(
  startDate: string,
  endDate: string,
  workingDays: string[],
  holidayDates: Set<string> = new Set()
): number {
  if (!startDate || !endDate || startDate > endDate) return 0;
  const allowed = new Set(workingDays.map((d) => d.toLowerCase()));
  let count = 0;
  let cursor = parseISO(startDate);
  const end = parseISO(endDate);
  while (cursor <= end) {
    const key = formatISO(cursor, { representation: "date" });
    const name = WEEKDAY[cursor.getUTCDay()];
    // parseISO('YYYY-MM-DD') is UTC midnight — getUTCDay matches calendar date.
    if (allowed.has(name) && !holidayDates.has(key)) count += 1;
    cursor = addDays(cursor, 1);
  }
  return count;
}

/** List working YYYY-MM-DD keys from periodStart..throughDate (inclusive). */
export function listWorkingDates(
  periodStart: string,
  throughDate: string,
  workingDays: string[],
  holidayDates: Set<string> = new Set()
): string[] {
  if (periodStart > throughDate) return [];
  const allowed = new Set(workingDays.map((d) => d.toLowerCase()));
  const out: string[] = [];
  let cursor = parseISO(periodStart);
  const end = parseISO(throughDate);
  while (cursor <= end) {
    const key = formatISO(cursor, { representation: "date" });
    const name = WEEKDAY[cursor.getUTCDay()];
    if (allowed.has(name) && !holidayDates.has(key)) out.push(key);
    cursor = addDays(cursor, 1);
  }
  return out;
}
