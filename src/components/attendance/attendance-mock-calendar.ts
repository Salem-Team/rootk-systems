import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  startOfMonth,
  subDays,
} from "date-fns";
import type { AttendanceRecord } from "@/types";
import { demoNow, demoTodayKey } from "@/lib/mock-date";
import type {
  CalendarDay,
  CalendarDayKind,
  HeatmapDay,
  HeatmapLevel,
} from "./attendance-mock-types";

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
      kind = "absent";
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
      kind = "empty";
    }
    return { date, level: levelFromKind(kind), kind };
  });
}
