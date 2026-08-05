import { addDays, format, parseISO, startOfMonth } from "date-fns";
import { DEPARTMENTS } from "@/constants";
import { demoNow } from "@/lib/mock-date";
import type {
  Activity,
  AttendanceRecord,
  DashboardStats,
  Department,
  Employee,
  Holiday,
  LeaveRequest,
  MonthlyStat,
  WeeklyStat,
} from "@/types";

export interface SparkPoint {
  v: number;
}

export interface DepartmentStat {
  department: Department;
  present: number;
  late: number;
  absent: number;
  rate: number;
}

export interface BirthdayItem {
  id: string;
  name: string;
  department: Department;
  dateLabel: string;
  daysAway: number;
}

export interface CalendarEvent {
  id: string;
  date: string;
  kind: "attendance" | "leave" | "birthday" | "event" | "holiday";
  title: string;
}

export interface PersonalWeekPoint {
  day: string;
  hours: number;
  present: number;
}

function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h * 31 + input.charCodeAt(i)) % 1000;
  }
  return h;
}

export function sparklineFor(seed: string, points = 8): SparkPoint[] {
  const base = hash(seed);
  return Array.from({ length: points }, (_, i) => ({
    v: 40 + ((base + i * 17) % 55),
  }));
}

export function trendDelta(seed: string): number {
  const n = hash(seed) % 11;
  return n - 5; // -5 .. +5
}

export function buildDepartmentStats(
  employees: Employee[],
  attendance: AttendanceRecord[]
): DepartmentStat[] {
  const map = new Map(
    attendance.map((r) => [r.employeeId, r] as const)
  );

  return DEPARTMENTS.map((department) => {
    const members = employees.filter((e) => e.department === department);
    if (members.length === 0) {
      const seed = hash(department);
      return {
        department,
        present: 2 + (seed % 4),
        late: seed % 2,
        absent: seed % 3,
        rate: 82 + (seed % 16),
      };
    }
    let present = 0;
    let late = 0;
    let absent = 0;
    for (const m of members) {
      const rec = map.get(m.id);
      const status =
        rec?.status ?? (m.status === "on_leave" ? "on_leave" : "absent");
      if (status === "late") late += 1;
      else if (
        status === "present" ||
        status === "wfh" ||
        status === "early_leave" ||
        status === "half_day"
      ) {
        present += 1;
      } else if (status === "on_leave") {
        // Leave is not absence — keep rates aligned with the team board.
      } else {
        absent += 1;
      }
    }
    const rate = Math.round(((present + late * 0.5) / members.length) * 1000) / 10;
    return { department, present, late, absent, rate };
  }).sort((a, b) => b.rate - a.rate);
}

export function buildBirthdays(employees: Employee[]): BirthdayItem[] {
  const today = demoNow();
  return employees.slice(0, 6).map((e, index) => {
    const daysAway = (hash(e.id) % 18) + index;
    const date = addDays(today, daysAway);
    return {
      id: e.id,
      name: e.name,
      department: e.department,
      dateLabel: format(date, "MMM d"),
      daysAway,
    };
  });
}

export function buildCompanyCalendarEvents(input: {
  holidays: Holiday[];
  leaves: LeaveRequest[];
  birthdays: BirthdayItem[];
}): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  for (const h of input.holidays.slice(0, 6)) {
    events.push({
      id: h.id,
      date: h.date,
      kind: h.type === "holiday" ? "holiday" : "event",
      title: h.name,
    });
  }
  for (const leave of input.leaves.slice(0, 4)) {
    events.push({
      id: leave.id,
      date: leave.startDate,
      kind: "leave",
      title: `Leave · ${leave.type}`,
    });
  }
  for (const b of input.birthdays.slice(0, 4)) {
    const date = format(addDays(demoNow(), b.daysAway), "yyyy-MM-dd");
    events.push({
      id: `bday-${b.id}`,
      date,
      kind: "birthday",
      title: `${b.name}`,
    });
  }
  const monthStart = startOfMonth(demoNow());
  for (let i = 0; i < 5; i += 1) {
    const d = addDays(monthStart, 2 + i * 4);
    if (d.getDay() === 5 || d.getDay() === 6) continue;
    events.push({
      id: `att-${i}`,
      date: format(d, "yyyy-MM-dd"),
      kind: "attendance",
      title: "Team attendance review",
    });
  }
  return events.sort((a, b) => a.date.localeCompare(b.date));
}

export function groupActivitiesByDay(
  activities: Activity[]
): { dayKey: string; items: Activity[] }[] {
  const groups = new Map<string, Activity[]>();
  for (const activity of activities) {
    const dayKey = format(parseISO(activity.timestamp), "yyyy-MM-dd");
    const list = groups.get(dayKey) ?? [];
    list.push(activity);
    groups.set(dayKey, list);
  }
  return Array.from(groups.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([dayKey, items]) => ({
      dayKey,
      items: items.sort(
        (a, b) =>
          parseISO(b.timestamp).getTime() - parseISO(a.timestamp).getTime()
      ),
    }));
}

export function personalWeekHours(seed = "me"): PersonalWeekPoint[] {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days.map((day) => {
    const h = hash(`${seed}-${day}`);
    const isWeekend = day === "Fri" || day === "Sat";
    return {
      day,
      hours: isWeekend ? 0 : 7 + (h % 20) / 10,
      present: isWeekend ? 0 : 1,
    };
  });
}

export function personalMonthlyScore(seed = "me"): number {
  return 86 + (hash(seed) % 12);
}

export function attendanceStreak(seed = "me"): number {
  return 5 + (hash(seed) % 10);
}

export function leaveBalanceMock(seed = "me"): {
  remaining: number;
  used: number;
  pending: number;
} {
  const h = hash(seed);
  return {
    remaining: 12 + (h % 8),
    used: 4 + (h % 5),
    pending: h % 3,
  };
}

export function executiveHighlights(stats: DashboardStats): {
  labelKey: string;
  value: number;
  tone: "good" | "warn" | "neutral";
}[] {
  return [
    {
      labelKey: "dashboard.present",
      value: stats.present,
      tone: "good",
    },
    {
      labelKey: "dashboard.late",
      value: stats.late,
      tone: stats.late > 2 ? "warn" : "neutral",
    },
    {
      labelKey: "dashboard.wfh",
      value: stats.wfh,
      tone: "neutral",
    },
    {
      labelKey: "dashboard.absent",
      value: stats.absent,
      tone: stats.absent > 2 ? "warn" : "neutral",
    },
    {
      labelKey: "status.on_leave",
      value: stats.onLeave,
      tone: "neutral",
    },
    {
      labelKey: "dashboard.attendanceRate",
      value: stats.attendanceRate,
      tone: stats.attendanceRate >= 90 ? "good" : "warn",
    },
  ];
}

export function weeklyToTrend(weekly: WeeklyStat[]): number {
  if (weekly.length < 2) return 0;
  const first = weekly[0].present;
  const last = weekly[weekly.length - 1].present;
  return last - first;
}

export function monthlyRateDelta(monthly: MonthlyStat[]): number {
  if (monthly.length < 2) return 0;
  const a = monthly[monthly.length - 2].attendanceRate;
  const b = monthly[monthly.length - 1].attendanceRate;
  return Math.round((b - a) * 10) / 10;
}
