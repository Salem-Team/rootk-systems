import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  subDays,
} from "date-fns";
import type { AttendanceRecord, AttendanceStatus } from "@/types";
import { demoNow, demoTodayKey, MOCK_TZ_OFFSET } from "@/lib/mock-date";

export type WorkMode = "office" | "hybrid" | "remote";

export type CalendarDayKind =
  | "present"
  | "late"
  | "absent"
  | "leave"
  | "wfh"
  | "holiday"
  | "empty"
  | "today";

export type HeatmapLevel = 0 | 1 | 2 | 3 | 4;

export interface WorkdayTimelineEvent {
  id: string;
  type:
    | "arrived"
    | "started"
    | "break_start"
    | "break_end"
    | "meeting"
    | "check_out"
    | "late"
    | "wfh";
  titleKey: string;
  detailKey: string;
  at: string;
}

export interface WeeklyAttendanceSummary {
  hoursWorked: number;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  overtimeHours: number;
  attendanceRate: number;
}

export interface MonthlyChartPoint {
  label: string;
  present: number;
  late: number;
  absent: number;
  hours: number;
  rate: number;
}

export interface CalendarDay {
  date: string;
  kind: CalendarDayKind;
  inMonth: boolean;
  isToday: boolean;
}

export interface HeatmapDay {
  date: string;
  level: HeatmapLevel;
  kind: CalendarDayKind;
}

function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h * 31 + input.charCodeAt(i)) % 1000;
  }
  return h;
}

export function resolveWorkMode(
  record: AttendanceRecord | null
): WorkMode {
  if (!record?.checkIn) return "office";
  if (record.status === "wfh") return "remote";
  return "office";
}

export function expectedCheckOutIso(
  dateKey?: string,
  toTime = "18:00"
): string | null {
  if (!dateKey) return null;
  const time = toTime.length === 5 ? `${toTime}:00` : toTime;
  return `${dateKey}T${time}${MOCK_TZ_OFFSET}`;
}

export function buildWorkdayTimeline(
  record: AttendanceRecord | null
): WorkdayTimelineEvent[] {
  if (!record?.checkIn) return [];

  const checkIn = parseISO(record.checkIn);
  const events: WorkdayTimelineEvent[] = [
    {
      id: "arrived",
      type: record.status === "wfh" ? "wfh" : "arrived",
      titleKey:
        record.status === "wfh"
          ? "attendance.tlWfh"
          : "attendance.tlArrived",
      detailKey:
        record.status === "wfh"
          ? "attendance.tlWfhDetail"
          : "attendance.tlArrivedDetail",
      at: record.checkIn,
    },
  ];

  if (record.isLate) {
    events.push({
      id: "late",
      type: "late",
      titleKey: "attendance.tlLate",
      detailKey: "attendance.tlLateDetail",
      at: record.checkIn,
    });
  }

  events.push({
    id: "started",
    type: "started",
    titleKey: "attendance.tlStarted",
    detailKey: "attendance.tlStartedDetail",
    at: new Date(checkIn.getTime() + 8 * 60_000).toISOString(),
  });

  const breakStart = new Date(checkIn.getTime() + 3.5 * 60 * 60_000);
  const breakEnd = new Date(breakStart.getTime() + 45 * 60_000);
  const meeting = new Date(checkIn.getTime() + 5.25 * 60 * 60_000);

  if (!record.checkOut || breakStart < parseISO(record.checkOut)) {
    events.push({
      id: "break-start",
      type: "break_start",
      titleKey: "attendance.tlBreakStart",
      detailKey: "attendance.tlBreakStartDetail",
      at: breakStart.toISOString(),
    });
    events.push({
      id: "break-end",
      type: "break_end",
      titleKey: "attendance.tlBreakEnd",
      detailKey: "attendance.tlBreakEndDetail",
      at: breakEnd.toISOString(),
    });
  }

  if (!record.checkOut || meeting < parseISO(record.checkOut)) {
    events.push({
      id: "meeting",
      type: "meeting",
      titleKey: "attendance.tlMeeting",
      detailKey: "attendance.tlMeetingDetail",
      at: meeting.toISOString(),
    });
  }

  if (record.checkOut) {
    events.push({
      id: "check-out",
      type: "check_out",
      titleKey: record.isEarlyLeave
        ? "attendance.earlyLeave"
        : "attendance.tlCheckOut",
      detailKey: record.isEarlyLeave
        ? "attendance.tlEarlyDetail"
        : "attendance.tlCheckOutDetail",
      at: record.checkOut,
    });
  }

  return events.sort(
    (a, b) => parseISO(a.at).getTime() - parseISO(b.at).getTime()
  );
}

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
  const hoursWorked = Math.round((minutes / 60) * 10) / 10 || presentDays * 8.2;
  const overtimeHours =
    Math.round(Math.max(0, hoursWorked - presentDays * 8) * 10) / 10;
  const attendanceRate = Math.min(
    100,
    Math.round((presentDays / 5) * 1000) / 10 || 92
  );

  return {
    hoursWorked,
    presentDays: presentDays || 4,
    lateDays: lateDays || 1,
    absentDays,
    overtimeHours: overtimeHours || 1.5,
    attendanceRate,
  };
}

export function buildMonthlyAnalytics(
  records: AttendanceRecord[]
): MonthlyChartPoint[] {
  const weeks = ["W1", "W2", "W3", "W4"] as const;
  return weeks.map((label, index) => {
    const seed = hashSeed(`month-${label}-${records.length}`);
    const slice = records.slice(index * 3, index * 3 + 5);
    const present =
      slice.filter((r) =>
        ["present", "wfh", "early_leave", "half_day"].includes(r.status)
      ).length || 3 + (seed % 2);
    const late =
      slice.filter((r) => r.isLate || r.status === "late").length || seed % 3;
    const absent = Math.max(0, 5 - present - late);
    const hours =
      Math.round(
        (slice.reduce((s, r) => s + r.workingMinutes, 0) / 60 ||
          32 + (seed % 8)) * 10
      ) / 10;
    const rate = Math.min(99, Math.round(((present + late * 0.5) / 5) * 100));
    return { label, present, late, absent, hours, rate };
  });
}

function kindFromRecord(record?: AttendanceRecord): CalendarDayKind {
  if (!record) return "absent";
  if (record.status === "on_leave") return "leave";
  if (record.status === "wfh") return "wfh";
  if (record.status === "late" || record.isLate) return "late";
  if (record.status === "absent") return "absent";
  if (["present", "early_leave", "half_day"].includes(record.status)) {
    return "present";
  }
  return "absent";
}

function levelFromKind(kind: CalendarDayKind): HeatmapLevel {
  switch (kind) {
    case "present":
      return 4;
    case "wfh":
      return 3;
    case "late":
      return 2;
    case "leave":
    case "holiday":
      return 1;
    default:
      return 0;
  }
}

export function buildCalendarMonth(
  records: AttendanceRecord[],
  month: Date = demoNow()
): CalendarDay[] {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const todayStr = demoTodayKey();
  const byDate = new Map(records.map((r) => [r.date, r]));

  const days = eachDayOfInterval({ start, end });
  const startPad = start.getDay(); // 0 Sun
  const padStart = Array.from({ length: startPad }, (_, i) => {
    const d = subDays(start, startPad - i);
    return {
      date: format(d, "yyyy-MM-dd"),
      kind: "empty" as CalendarDayKind,
      inMonth: false,
      isToday: false,
    };
  });

  const monthDays: CalendarDay[] = days.map((d) => {
    const date = format(d, "yyyy-MM-dd");
    const isToday = date === todayStr;
    const isFriday = d.getDay() === 5;
    const isSaturday = d.getDay() === 6;
    let kind: CalendarDayKind;
    if (isFriday || isSaturday) {
      kind = "holiday";
    } else if (byDate.has(date)) {
      kind = kindFromRecord(byDate.get(date));
    } else if (d > demoNow()) {
      kind = "empty";
    } else {
      const seed = hashSeed(date);
      const cycle: CalendarDayKind[] = [
        "present",
        "present",
        "late",
        "wfh",
        "present",
        "absent",
        "leave",
      ];
      kind = cycle[seed % cycle.length];
    }
    return { date, kind, inMonth: true, isToday };
  });

  const trailing = (7 - ((padStart.length + monthDays.length) % 7)) % 7;
  const padEnd = Array.from({ length: trailing }, (_, i) => {
    const d = addDays(end, i + 1);
    return {
      date: format(d, "yyyy-MM-dd"),
      kind: "empty" as CalendarDayKind,
      inMonth: false,
      isToday: false,
    };
  });

  return [...padStart, ...monthDays, ...padEnd];
}

export function buildHeatmap(
  records: AttendanceRecord[],
  weeks = 16
): HeatmapDay[] {
  const today = demoNow();
  const start = subDays(today, weeks * 7 - 1);
  const byDate = new Map(records.map((r) => [r.date, r]));
  const days = eachDayOfInterval({ start, end: today });

  return days.map((d) => {
    const date = format(d, "yyyy-MM-dd");
    const dow = d.getDay();
    if (dow === 5 || dow === 6) {
      return { date, level: 0 as HeatmapLevel, kind: "holiday" as CalendarDayKind };
    }
    const record = byDate.get(date);
    let kind: CalendarDayKind;
    if (record) {
      kind = kindFromRecord(record);
    } else {
      const seed = hashSeed(date);
      const cycle: CalendarDayKind[] = [
        "present",
        "present",
        "present",
        "late",
        "wfh",
        "absent",
        "leave",
      ];
      kind = cycle[seed % cycle.length];
    }
    return { date, level: levelFromKind(kind), kind };
  });
}

export function statusLabelKey(status: AttendanceStatus | "none"): string {
  if (status === "none") return "attendance.notCheckedIn";
  return `status.${status}`;
}
