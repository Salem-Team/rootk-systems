import { dayOfWeekFromDateKey } from "@/lib/wfh-policy";
import { countWorkingDaysInRange } from "@/lib/working-days";
import type { SchedulePayrollContext } from "@/types/payroll";

export function inferEarlyLeaveMinutes(
  row: {
    earlyLeaveMinutes?: number;
    isEarlyLeave: boolean;
    workingMinutes: number;
  },
  scheduledNet: number
): number {
  if (typeof row.earlyLeaveMinutes === "number" && row.earlyLeaveMinutes > 0) {
    return row.earlyLeaveMinutes;
  }
  if (!row.isEarlyLeave) return 0;
  if (row.workingMinutes > 0 && scheduledNet > row.workingMinutes) {
    return scheduledNet - row.workingMinutes;
  }
  return Math.round(scheduledNet * 0.25);
}

export function aggregateAttendanceOvertime(
  rows: {
    date: string;
    workingMinutes: number;
    overtimeMinutes?: number;
    checkOut?: string;
  }[],
  scheduleCtx: SchedulePayrollContext,
  holidayDates: Set<string>
): { regular: number; weekend: number; holiday: number } {
  let regular = 0;
  let weekend = 0;
  let holiday = 0;
  const minNet = scheduleCtx.minimumWorkingMinutes;

  for (const row of rows) {
    if (!row.checkOut && row.workingMinutes <= 0) continue;
    const day = dayOfWeekFromDateKey(row.date);
    const fromField = (row.overtimeMinutes ?? 0) / 60;
    const fromExcess = Math.max(0, (row.workingMinutes - minNet) / 60);
    const otHours = fromField > 0 ? fromField : fromExcess;

    if (holidayDates.has(row.date)) {
      holiday += otHours > 0 ? otHours : row.workingMinutes / 60;
    } else if (scheduleCtx.weekendDays.includes(day)) {
      weekend += row.workingMinutes / 60;
    } else {
      regular += otHours;
    }
  }

  return {
    regular: Math.round(regular * 100) / 100,
    weekend: Math.round(weekend * 100) / 100,
    holiday: Math.round(holiday * 100) / 100,
  };
}

export function isNightShiftHint(checkIn?: string): boolean {
  if (!checkIn) return false;
  // Prefer the hour as written in the timestamp (company-local), not the device TZ.
  const match = checkIn.match(/T(\d{2}):/);
  if (match) {
    const hour = Number(match[1]);
    return hour >= 20 || hour < 6;
  }
  const timePart = checkIn.includes(" ")
    ? (checkIn.split(" ")[1] ?? checkIn)
    : checkIn;
  const hour = Number(timePart.split(":")[0] ?? Number.NaN);
  if (Number.isNaN(hour)) return false;
  return hour >= 20 || hour < 6;
}

/** Working-day overlap between a leave span and the payroll period. */
export function leaveDaysInPeriod(
  startDate: string,
  endDate: string,
  periodStart: string,
  periodEnd: string,
  workingDays: string[],
  holidayDates: Set<string>,
  fallbackDays: number
): number {
  const start = startDate > periodStart ? startDate : periodStart;
  const end = endDate < periodEnd ? endDate : periodEnd;
  if (start > end) return 0;
  const counted = countWorkingDaysInRange(
    start,
    end,
    workingDays,
    holidayDates
  );
  return counted > 0 ? counted : fallbackDays;
}
