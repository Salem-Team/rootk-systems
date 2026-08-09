import { format } from "date-fns";
import { countWorkingDaysInRange } from "@/lib/working-days";
import type { DayOfWeek, WorkSchedule } from "@/types";

export const DEFAULT_WORKING_DAYS: DayOfWeek[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
];

export function workingDaysBetween(
  from: Date,
  to: Date,
  schedule: Pick<WorkSchedule, "workingDays" | "holidays">
): number {
  const start = format(from, "yyyy-MM-dd");
  const end = format(to, "yyyy-MM-dd");
  const holidayDates = new Set(
    schedule.holidays
      .filter((h) => h.type === "holiday")
      .map((h) => h.date)
  );
  return Math.max(
    countWorkingDaysInRange(start, end, schedule.workingDays, holidayDates),
    1
  );
}
