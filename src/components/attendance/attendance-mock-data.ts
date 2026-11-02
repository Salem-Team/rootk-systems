import { parseISO, subDays } from "date-fns";
import type { AttendanceRecord, AttendanceStatus } from "@/types";
import { demoNow } from "@/lib/mock-date";
import type { WeeklyAttendanceSummary } from "./attendance-mock-types";

export type {
  CalendarDay,
  CalendarDayKind,
  HeatmapDay,
  HeatmapLevel,
  MonthlyChartPoint,
  WeeklyAttendanceSummary,
  WorkdayTimelineEvent,
  WorkMode,
} from "./attendance-mock-types";
export { buildCalendarMonth, buildHeatmap } from "./attendance-mock-calendar";
export {
  buildWorkdayTimeline,
  expectedCheckOutIso,
  resolveWorkMode,
} from "./attendance-mock-timeline";

/** Derive weekly cards from history + deterministic fill for gaps. */
export function buildWeeklySummary(
  records: AttendanceRecord[]
): WeeklyAttendanceSummary {
  const today = demoNow();
  const weekStart = subDays(today, 6);
  const weekRecords = records.filter((r) => {
    const d = parseISO(r.date);
    return d >= weekStart && d <= today;
  });

  const presentDays = weekRecords.filter((r) =>
    ["present", "late", "wfh", "early_leave", "half_day"].includes(r.status)
  ).length;
  const lateDays = weekRecords.filter((r) => r.isLate || r.status === "late").length;
  const absentDays = Math.max(0, 5 - presentDays);
  const minutes = weekRecords.reduce((sum, r) => sum + (r.workingMinutes || 0), 0);
  const hoursWorked = Math.round((minutes / 60) * 10) / 10;
  const overtimeHours =
    Math.round(Math.max(0, hoursWorked - presentDays * 8) * 10) / 10;
  const attendanceRate =
    presentDays === 0
      ? 0
      : Math.min(100, Math.round((presentDays / 5) * 1000) / 10);

  return {
    hoursWorked,
    presentDays,
    lateDays,
    absentDays,
    overtimeHours,
    attendanceRate,
  };
}

export {
  buildMonthlyAnalytics,
  type MonthlyAnalyticsResult,
} from "@/lib/attendance/build-monthly-analytics";

export function statusLabelKey(status: AttendanceStatus | "none"): string {
  if (status === "none") return "attendance.notCheckedIn";
  return `status.${status}`;
}
