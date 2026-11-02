import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type { AttendanceRecord, AttendanceStatus } from "@/types";
import type { MonthlyChartPoint } from "@/components/attendance/attendance-mock-types";

const ATTENDED: AttendanceStatus[] = [
  "present",
  "late",
  "wfh",
  "early_leave",
  "half_day",
];

export interface MonthlyAnalyticsResult {
  monthKey: string;
  weeks: MonthlyChartPoint[];
  totals: {
    present: number;
    late: number;
    absent: number;
    wfh: number;
    hours: number;
    lateMinutes: number;
    rate: number;
    recordCount: number;
  };
}

function isAttended(status: AttendanceStatus): boolean {
  return ATTENDED.includes(status);
}

function isLateRecord(record: AttendanceRecord): boolean {
  return record.isLate || record.status === "late";
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function weekBuckets(month: Date): { start: Date; end: Date }[] {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  let cursor = startOfWeek(monthStart, { weekStartsOn: 0 });
  const buckets: { start: Date; end: Date }[] = [];

  while (cursor <= monthEnd) {
    const weekStart = cursor;
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
    const start = weekStart < monthStart ? monthStart : weekStart;
    const end = weekEnd > monthEnd ? monthEnd : weekEnd;
    if (isSameMonth(start, month) || isSameMonth(end, month)) {
      buckets.push({ start, end });
    }
    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() + 7);
  }

  return buckets;
}

function aggregateRecords(records: AttendanceRecord[]) {
  let present = 0;
  let late = 0;
  let absent = 0;
  let wfh = 0;
  let minutes = 0;
  let lateMinutes = 0;

  for (const record of records) {
    minutes += Math.max(0, record.workingMinutes || 0);
    lateMinutes += Math.max(0, record.lateMinutes || 0);
    if (record.status === "wfh") wfh += 1;
    if (isLateRecord(record)) late += 1;
    if (record.status === "absent") absent += 1;
    else if (isAttended(record.status)) present += 1;
  }

  const attended = present;
  const rateBase = attended + absent;
  const rate =
    rateBase <= 0 ? 0 : Math.min(100, Math.round((attended / rateBase) * 1000) / 10);

  return {
    present,
    late,
    absent,
    wfh,
    hours: round1(minutes / 60),
    lateMinutes,
    rate,
  };
}

/** Real week-of-month series from attendance rows (no mock fill). */
export function buildMonthlyAnalytics(
  records: AttendanceRecord[],
  month: Date,
  weekLabel: (index: number) => string = (i) => `W${i + 1}`
): MonthlyAnalyticsResult {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const monthKey = format(monthStart, "yyyy-MM");

  const inMonth = records.filter((record) => {
    const day = parseISO(record.date);
    return day >= monthStart && day <= monthEnd;
  });

  const byDate = new Map(inMonth.map((record) => [record.date, record]));
  const buckets = weekBuckets(month);

  const weeks: MonthlyChartPoint[] = buckets.map((bucket, index) => {
    const days = eachDayOfInterval({ start: bucket.start, end: bucket.end });
    const weekRecords = days
      .map((day) => byDate.get(format(day, "yyyy-MM-dd")))
      .filter((row): row is AttendanceRecord => Boolean(row));

    const stats = aggregateRecords(weekRecords);
    const startDay = format(bucket.start, "d");
    const endDay = format(bucket.end, "d");

    return {
      label: weekLabel(index),
      rangeLabel: startDay === endDay ? startDay : `${startDay}–${endDay}`,
      present: stats.present,
      late: stats.late,
      absent: stats.absent,
      wfh: stats.wfh,
      hours: stats.hours,
      lateMinutes: stats.lateMinutes,
      rate: stats.rate,
    };
  });

  const totals = {
    ...aggregateRecords(inMonth),
    recordCount: inMonth.length,
  };

  return { monthKey, weeks, totals };
}

/** Working weekdays in a month that have no attendance row (Sun–Thu default). */
export function countUnloggedWorkingDays(
  records: AttendanceRecord[],
  month: Date,
  workingDays: number[] = [0, 1, 2, 3, 4]
): number {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const logged = new Set(
    records
      .filter((record) => {
        const day = parseISO(record.date);
        return day >= monthStart && day <= monthEnd;
      })
      .map((record) => record.date)
  );

  let missing = 0;
  for (const day of eachDayOfInterval({ start: monthStart, end: monthEnd })) {
    if (!workingDays.includes(getDay(day))) continue;
    if (day > new Date()) continue;
    if (!logged.has(format(day, "yyyy-MM-dd"))) missing += 1;
  }
  return missing;
}
