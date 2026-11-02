import {
  eachDayOfInterval,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns";
import { enUS } from "date-fns/locale";
import type {
  DeptAnalyticsRow,
  ExecutiveKpi,
  HeatCell,
  InsightItem,
  LeaveAnalyticsPoint,
  TrendPoint,
} from "@/components/reports/analytics-mock-data";
import type { SparkPoint } from "@/components/dashboard/dashboard-mock-data";
import type {
  AttendanceRecord,
  DailyReportRow,
  DashboardStats,
  Department,
  Employee,
  LeaveRequest,
  MonthlyStat,
  WeeklyStat,
} from "@/types";

export type AnalyticsBundle = {
  executiveKpis: ExecutiveKpi[];
  summary: ReportSummaryStats;
  departments: DeptAnalyticsRow[];
  weeklyTrends: TrendPoint[];
  monthlyTrends: TrendPoint[];
  quarterlyTrends: TrendPoint[];
  leaveSeries: LeaveAnalyticsPoint[];
  modePie: Array<{ nameKey: string; value: number; fill: string }>;
  radar: Array<{ subjectKey: string; score: number }>;
  insights: InsightItem[];
  deptHeatmap: HeatCell[];
  weekHeatmap: HeatCell[];
  leaveCards: {
    onLeaveDays: number;
    leaveSharePct: number;
    pendingCount: number;
    approvedCount: number;
  };
};

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function pct(part: number, whole: number) {
  if (whole <= 0) return 0;
  return round1((part / whole) * 100);
}

function levelFromRate(rate: number): HeatCell["level"] {
  if (rate <= 0) return 0;
  if (rate < 25) return 1;
  if (rate < 50) return 2;
  if (rate < 75) return 3;
  return 4;
}

function sparkFromRates(rates: number[]): SparkPoint[] {
  if (rates.length === 0) return [{ v: 0 }];
  return rates.slice(-8).map((v) => ({ v }));
}

function dayKey(date: string) {
  try {
    // Always English abbreviations so chart keys match i18n maps.
    return format(parseISO(date), "EEE", { locale: enUS });
  } catch {
    return date.slice(0, 3);
  }
}

function monthKey(date: string) {
  try {
    return format(parseISO(date), "MMM", { locale: enUS });
  } catch {
    return date.slice(5, 7);
  }
}

function groupByDate(records: AttendanceRecord[]) {
  const map = new Map<string, AttendanceRecord[]>();
  for (const row of records) {
    const list = map.get(row.date) ?? [];
    list.push(row);
    map.set(row.date, list);
  }
  return map;
}

function isPresentish(status: AttendanceRecord["status"]) {
  return ["present", "late", "wfh", "half_day", "early_leave"].includes(status);
}

function attendanceRateForDay(rows: AttendanceRecord[], headcount = 0) {
  if (headcount > 0) {
    return pct(rows.filter((r) => isPresentish(r.status)).length, headcount);
  }
  if (rows.length === 0) return 0;
  return pct(rows.filter((r) => isPresentish(r.status)).length, rows.length);
}

function weeklyHasSignal(weekly: WeeklyStat[]) {
  return weekly.some((d) => d.present + d.late + d.absent + d.wfh > 0);
}

function monthlyHasSignal(monthly: MonthlyStat[]) {
  return monthly.some((m) => m.attendanceRate > 0 || m.avgHours > 0);
}

export type ReportSummaryStats = {
  present: number;
  late: number;
  absent: number;
  wfh: number;
  onLeave: number;
  attendanceRate: number;
  avgHours: number;
  totalEmployees: number;
};

/** Range-scoped summary from live attendance (not today's dashboard snapshot). */
export function summarizeAttendanceRange(
  attendance: AttendanceRecord[],
  employees: Employee[]
): ReportSummaryStats {
  const active = employees.filter((e) => !e.deletedAt && e.status !== "inactive");
  const headcount = Math.max(active.length, 1);
  const byDate = groupByDate(attendance);
  const dates = [...byDate.keys()];
  const present = attendance.filter((r) => r.status === "present").length;
  const late = attendance.filter((r) => r.status === "late" || r.isLate).length;
  const absent = attendance.filter((r) => r.status === "absent").length;
  const wfh = attendance.filter((r) => r.status === "wfh").length;
  const onLeave = attendance.filter((r) => r.status === "on_leave").length;

  const attendanceRate =
    dates.length === 0
      ? 0
      : round1(
          dates.reduce(
            (sum, d) => sum + attendanceRateForDay(byDate.get(d) ?? [], headcount),
            0
          ) / dates.length
        );

  const worked = attendance.filter((r) => (r.workingMinutes ?? 0) > 0);
  const avgHours =
    worked.length > 0
      ? round1(
          worked.reduce((s, r) => s + r.workingMinutes, 0) / worked.length / 60
        )
      : 0;

  return {
    present,
    late,
    absent,
    wfh,
    onLeave,
    attendanceRate,
    avgHours,
    totalEmployees: active.length,
  };
}

export function computeExecutiveKpis(input: {
  stats: DashboardStats;
  attendance: AttendanceRecord[];
  employees: Employee[];
  weekly: WeeklyStat[];
  monthly: MonthlyStat[];
  activity: DailyReportRow[];
}): ExecutiveKpi[] {
  const { attendance, employees, weekly, monthly, activity } = input;
  const summary = summarizeAttendanceRange(attendance, employees);
  const byDate = groupByDate(attendance);
  const dates = [...byDate.keys()].sort();
  const headcount = Math.max(summary.totalEmployees, 1);
  const recentRates = dates
    .slice(-8)
    .map((d) => attendanceRateForDay(byDate.get(d) ?? [], headcount));

  const useWeekly = weeklyHasSignal(weekly);
  const lateCount = useWeekly
    ? weekly.reduce((s, d) => s + d.late, 0)
    : summary.late;
  const absentCount = useWeekly
    ? weekly.reduce((s, d) => s + d.absent, 0)
    : summary.absent;
  const wfhCount = useWeekly
    ? weekly.reduce((s, d) => s + d.wfh, 0)
    : summary.wfh;
  const presentCount = useWeekly
    ? weekly.reduce((s, d) => s + d.present, 0)
    : summary.present;
  const weekTotal = Math.max(presentCount + lateCount + absentCount + wfhCount, 1);

  const avgHours =
    monthlyHasSignal(monthly)
      ? round1(monthly.reduce((s, m) => s + m.avgHours, 0) / monthly.length)
      : summary.avgHours;

  const avgRate = summary.attendanceRate > 0
    ? summary.attendanceRate
    : monthlyHasSignal(monthly)
      ? round1(
          monthly.reduce((s, m) => s + m.attendanceRate, 0) / monthly.length
        )
      : input.stats.attendanceRate;

  const lateShare = pct(lateCount, weekTotal);
  const absentShare = pct(absentCount, weekTotal);
  const leaveDays = summary.onLeave;
  const efficiency = Math.max(
    0,
    Math.min(100, round1(avgRate - lateShare * 0.35))
  );

  const actionScore = (r: DailyReportRow) =>
    (r.tasksCompleted ?? 0) + (r.adsCount ?? 0) + (r.crmCount ?? 0);
  const productivity =
    activity.length > 0
      ? round1(activity.reduce((s, r) => s + actionScore(r), 0) / activity.length)
      : 0;

  const rateTrend =
    recentRates.length >= 2
      ? round1(recentRates[recentRates.length - 1]! - recentRates[0]!)
      : 0;

  const hoursSpark = dates.slice(-8).map((d) => {
    const rows = (byDate.get(d) ?? []).filter((r) => (r.workingMinutes ?? 0) > 0);
    if (!rows.length) return 0;
    return rows.reduce((s, r) => s + r.workingMinutes, 0) / rows.length / 60;
  });

  return [
    {
      id: "rate",
      labelKey: "analytics.kpiAttendanceRate",
      value: round1(avgRate),
      suffix: "%",
      decimals: 1,
      trend: rateTrend,
      badgeKey: rateTrend >= 0 ? "analytics.improving" : "analytics.vsTarget",
      tone: "text-primary",
      spark: sparkFromRates(recentRates),
      status: avgRate >= 90 ? "good" : avgRate >= 75 ? "neutral" : "warn",
    },
    {
      id: "hours",
      labelKey: "analytics.kpiAvgHours",
      value: round1(avgHours),
      suffix: "h",
      decimals: 1,
      trend: 0,
      badgeKey: "analytics.ytd",
      tone: "text-teal-800 dark:text-teal-300",
      spark: sparkFromRates(hoursSpark),
      status: avgHours >= 7 ? "good" : avgHours >= 5 ? "neutral" : "warn",
    },
    {
      id: "late",
      labelKey: "analytics.kpiLateRate",
      value: lateShare,
      suffix: "%",
      decimals: 1,
      trend: 0,
      badgeKey: "analytics.weekly",
      tone: "text-amber-700 dark:text-amber-400",
      spark: sparkFromRates(
        useWeekly
          ? weekly.map((d) => d.late)
          : dates.slice(-8).map(
              (d) =>
                (byDate.get(d) ?? []).filter((r) => r.status === "late" || r.isLate)
                  .length
            )
      ),
      status: lateShare <= 10 ? "good" : lateShare <= 20 ? "neutral" : "warn",
    },
    {
      id: "absent",
      labelKey: "analytics.kpiAbsenceRate",
      value: absentShare,
      suffix: "%",
      decimals: 1,
      trend: 0,
      badgeKey: "analytics.weekly",
      tone: "text-rose-700 dark:text-rose-400",
      spark: sparkFromRates(
        useWeekly
          ? weekly.map((d) => d.absent)
          : dates.slice(-8).map(
              (d) =>
                (byDate.get(d) ?? []).filter((r) => r.status === "absent").length
            )
      ),
      status: absentShare <= 8 ? "good" : absentShare <= 15 ? "neutral" : "warn",
    },
    {
      id: "leave",
      labelKey: "analytics.kpiLeaveUtil",
      value: leaveDays,
      trend: 0,
      badgeKey: "analytics.ytd",
      tone: "text-violet-700 dark:text-violet-300",
      spark: sparkFromRates(
        dates.slice(-8).map(
          (d) =>
            (byDate.get(d) ?? []).filter((r) => r.status === "on_leave").length
        )
      ),
      status: "neutral",
    },
    {
      id: "efficiency",
      labelKey: "analytics.kpiDeptEfficiency",
      value: efficiency,
      suffix: "%",
      decimals: 1,
      trend: rateTrend,
      badgeKey: rateTrend >= 0 ? "analytics.improving" : "analytics.vsTarget",
      tone: "text-emerald-700 dark:text-emerald-400",
      spark: sparkFromRates(recentRates.map((r) => Math.max(0, r - lateShare * 0.2))),
      status: efficiency >= 85 ? "good" : efficiency >= 70 ? "neutral" : "warn",
    },
    {
      id: "productivity",
      labelKey: "analytics.kpiProductivity",
      value: productivity,
      decimals: 1,
      trend: 0,
      badgeKey: "analytics.ytd",
      tone: "text-sky-700 dark:text-sky-300",
      spark: sparkFromRates(activity.slice(0, 8).map(actionScore)),
      status: productivity >= 3 ? "good" : productivity >= 1 ? "neutral" : "warn",
    },
    {
      id: "wfh",
      labelKey: "analytics.kpiWfhRatio",
      value: pct(wfhCount, weekTotal),
      suffix: "%",
      decimals: 1,
      trend: 0,
      badgeKey: "analytics.weekly",
      tone: "text-indigo-700 dark:text-indigo-300",
      spark: sparkFromRates(
        useWeekly
          ? weekly.map((d) => d.wfh)
          : dates.slice(-8).map(
              (d) => (byDate.get(d) ?? []).filter((r) => r.status === "wfh").length
            )
      ),
      status: "neutral",
    },
  ];
}

export function computeDeptAnalytics(
  attendance: AttendanceRecord[],
  employees: Employee[]
): DeptAnalyticsRow[] {
  const empMap = new Map(employees.map((e) => [e.id, e]));
  const byDept = new Map<
    string,
    { total: number; present: number; late: number; leave: number; minutes: number }
  >();

  for (const row of attendance) {
    const emp = empMap.get(row.employeeId);
    if (!emp) continue;
    const dept = emp.department;
    const bucket = byDept.get(dept) ?? {
      total: 0,
      present: 0,
      late: 0,
      leave: 0,
      minutes: 0,
    };
    bucket.total += 1;
    if (["present", "late", "wfh", "half_day", "early_leave"].includes(row.status)) {
      bucket.present += 1;
    }
    if (row.status === "late" || row.isLate) bucket.late += 1;
    if (row.status === "on_leave") bucket.leave += 1;
    bucket.minutes += row.workingMinutes ?? 0;
    byDept.set(dept, bucket);
  }

  return [...byDept.entries()]
    .map(([department, b]) => ({
      department: department as Department,
      attendance: pct(b.present, b.total),
      late: pct(b.late, b.total),
      leave: pct(b.leave, b.total),
      productivity: b.total
        ? Math.min(100, Math.round(b.minutes / b.total / 4.8))
        : 0,
    }))
    .sort((a, b) => b.attendance - a.attendance);
}

function emptyTrend(label: string): TrendPoint {
  return {
    label,
    attendance: 0,
    hours: 0,
    late: 0,
    overtime: 0,
    wfh: 0,
    office: 0,
    hybrid: 0,
  };
}

export function computeTrendsFromAttendance(
  attendance: AttendanceRecord[],
  period: "weekly" | "monthly" | "quarterly",
  weeklyFallback: WeeklyStat[] = []
): TrendPoint[] {
  if (period === "weekly") {
    if (weeklyHasSignal(weeklyFallback)) {
      return weeklyFallback.map((d) => {
        const total = Math.max(d.present + d.late + d.absent + d.wfh, 1);
        const dayRows = attendance.filter((r) => dayKey(r.date) === d.day);
        const worked = dayRows.filter((r) => (r.workingMinutes ?? 0) > 0);
        const hours =
          worked.length > 0
            ? worked.reduce((s, r) => s + r.workingMinutes, 0) /
              worked.length /
              60
            : 0;
        return {
          label: d.day,
          attendance: pct(d.present + d.late + d.wfh, total),
          hours: round1(hours),
          late: d.late,
          overtime: Math.max(0, round1(hours - 8)),
          wfh: d.wfh,
          office: d.present,
          hybrid: dayRows.filter((r) => r.status === "half_day").length,
        };
      });
    }
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days.map((label) => {
      const rows = attendance.filter((r) => dayKey(r.date) === label);
      if (!rows.length) return emptyTrend(label);
      const present = rows.filter((r) => isPresentish(r.status)).length;
      const worked = rows.filter((r) => (r.workingMinutes ?? 0) > 0);
      const hours =
        worked.length > 0
          ? worked.reduce((s, r) => s + r.workingMinutes, 0) / worked.length / 60
          : 0;
      return {
        label,
        attendance: pct(present, rows.length),
        hours: round1(hours),
        late: rows.filter((r) => r.status === "late" || r.isLate).length,
        overtime: Math.max(0, round1(hours - 8)),
        wfh: rows.filter((r) => r.status === "wfh").length,
        office: rows.filter((r) => r.status === "present").length,
        hybrid: rows.filter((r) => r.status === "half_day").length,
      };
    });
  }

  if (period === "monthly") {
    const months = new Map<string, AttendanceRecord[]>();
    for (const row of attendance) {
      const key = monthKey(row.date);
      const list = months.get(key) ?? [];
      list.push(row);
      months.set(key, list);
    }
    const ordered = [...months.entries()].slice(-6);
    if (ordered.length === 0) {
      return ["Mar", "Apr", "May", "Jun", "Jul", "Aug"].map(emptyTrend);
    }
    return ordered.map(([label, rows]) => {
      const present = rows.filter((r) =>
        ["present", "late", "wfh", "half_day", "early_leave"].includes(r.status)
      ).length;
      const hours =
        rows.reduce((s, r) => s + r.workingMinutes, 0) / Math.max(rows.length, 1) / 60;
      return {
        label,
        attendance: pct(present, rows.length),
        hours: round1(hours),
        late: rows.filter((r) => r.status === "late" || r.isLate).length,
        overtime: Math.max(0, round1(hours - 8)),
        wfh: rows.filter((r) => r.status === "wfh").length,
        office: rows.filter((r) => r.status === "present").length,
        hybrid: rows.filter((r) => r.status === "half_day").length,
      };
    });
  }

  // quarterly: last 4 quarters approx by 3-month buckets
  const now = new Date();
  const points: TrendPoint[] = [];
  for (let i = 3; i >= 0; i -= 1) {
    const end = endOfMonth(subMonths(now, i * 3));
    const start = startOfMonth(subMonths(end, 2));
    const label = `Q${Math.floor(end.getMonth() / 3) + 1}`;
    const rows = attendance.filter((r) => {
      const d = parseISO(r.date);
      return d >= start && d <= end;
    });
    if (!rows.length) {
      points.push(emptyTrend(label));
      continue;
    }
    const present = rows.filter((r) =>
      ["present", "late", "wfh", "half_day", "early_leave"].includes(r.status)
    ).length;
    const hours =
      rows.reduce((s, r) => s + r.workingMinutes, 0) / rows.length / 60;
    points.push({
      label,
      attendance: pct(present, rows.length),
      hours: round1(hours),
      late: rows.filter((r) => r.status === "late" || r.isLate).length,
      overtime: Math.max(0, round1(hours - 8)),
      wfh: rows.filter((r) => r.status === "wfh").length,
      office: rows.filter((r) => r.status === "present").length,
      hybrid: rows.filter((r) => r.status === "half_day").length,
    });
  }
  return points;
}

export function computeLeaveSeries(
  attendance: AttendanceRecord[],
  leaveRequests: LeaveRequest[]
): LeaveAnalyticsPoint[] {
  const months = new Map<
    string,
    { utilized: number; pending: number; approved: number }
  >();

  for (const row of attendance.filter((r) => r.status === "on_leave")) {
    const key = monthKey(row.date);
    const b = months.get(key) ?? { utilized: 0, pending: 0, approved: 0 };
    b.utilized += 1;
    months.set(key, b);
  }

  for (const req of leaveRequests) {
    const key = monthKey(req.startDate || req.createdAt?.slice(0, 10) || "");
    if (!key) continue;
    const b = months.get(key) ?? { utilized: 0, pending: 0, approved: 0 };
    if (req.status === "pending") b.pending += 1;
    if (req.status === "approved") b.approved += 1;
    months.set(key, b);
  }

  const ordered = [...months.entries()].slice(-6);
  if (ordered.length === 0) {
    return ["Mar", "Apr", "May", "Jun", "Jul", "Aug"].map((label) => ({
      label,
      utilized: 0,
      remaining: 0,
      pending: 0,
      approved: 0,
    }));
  }

  return ordered.map(([label, b]) => ({
    label,
    utilized: b.utilized,
    remaining: Math.max(0, 20 - b.utilized),
    pending: b.pending,
    approved: b.approved,
  }));
}

export function computeModePie(attendance: AttendanceRecord[]) {
  const office = attendance.filter((r) =>
    ["present", "late", "early_leave"].includes(r.status)
  ).length;
  const hybrid = attendance.filter((r) => r.status === "half_day").length;
  const remote = attendance.filter((r) => r.status === "wfh").length;
  return [
    { nameKey: "analytics.modeOffice", value: office, fill: "var(--chart-1)" },
    { nameKey: "analytics.modeHybrid", value: hybrid, fill: "var(--chart-2)" },
    { nameKey: "analytics.modeRemote", value: remote, fill: "var(--chart-3)" },
  ].filter((p) => p.value > 0);
}

export function computeRadar(input: {
  stats: DashboardStats;
  attendance: AttendanceRecord[];
  activity: DailyReportRow[];
  weekly: WeeklyStat[];
}) {
  const { stats, attendance, activity, weekly } = input;
  const useWeekly = weeklyHasSignal(weekly);
  const late = useWeekly
    ? weekly.reduce((s, d) => s + d.late, 0)
    : attendance.filter((r) => r.status === "late" || r.isLate).length;
  const absent = useWeekly
    ? weekly.reduce((s, d) => s + d.absent, 0)
    : attendance.filter((r) => r.status === "absent").length;
  const total = Math.max(
    useWeekly
      ? weekly.reduce((s, d) => s + d.present + d.late + d.absent + d.wfh, 0)
      : attendance.length,
    1
  );
  const worked = attendance.filter((r) => (r.workingMinutes ?? 0) > 0);
  const hours =
    worked.length > 0
      ? worked.reduce((s, r) => s + r.workingMinutes, 0) / worked.length / 60
      : 0;
  const actions =
    activity.length > 0
      ? activity.reduce(
          (s, r) => s + r.tasksCompleted + r.adsCount + r.crmCount,
          0
        ) / activity.length
      : 0;

  return [
    {
      subjectKey: "analytics.radarAttendance",
      score: Math.min(100, Math.round(stats.attendanceRate)),
    },
    {
      subjectKey: "analytics.radarPunctuality",
      score: Math.max(0, Math.min(100, Math.round(100 - pct(late, total)))),
    },
    {
      subjectKey: "analytics.radarLeave",
      score: Math.max(0, Math.min(100, Math.round(100 - pct(absent, total)))),
    },
    {
      subjectKey: "analytics.radarHours",
      score: Math.min(100, Math.round((hours / 8) * 100)),
    },
    {
      subjectKey: "analytics.radarOvertime",
      score: Math.min(100, Math.round(Math.min(actions, 20) * 5)),
    },
  ];
}

export function computeInsights(input: {
  stats: DashboardStats;
  attendance: AttendanceRecord[];
  departments: DeptAnalyticsRow[];
  weekly: WeeklyStat[];
  activity: DailyReportRow[];
}): InsightItem[] {
  const { stats, attendance, departments, weekly, activity } = input;

  if (attendance.length === 0) {
    return [
      {
        id: "empty",
        tone: "info",
        titleKey: "analytics.insightEmptyTitle",
        bodyKey: "analytics.insightEmptyBody",
      },
    ];
  }

  const insights: InsightItem[] = [];
  const useWeekly = weeklyHasSignal(weekly);
  const late = useWeekly
    ? weekly.reduce((s, d) => s + d.late, 0)
    : attendance.filter((r) => r.status === "late" || r.isLate).length;
  const absent = useWeekly
    ? weekly.reduce((s, d) => s + d.absent, 0)
    : attendance.filter((r) => r.status === "absent").length;
  const top = departments[0];
  const low = [...departments].sort((a, b) => a.attendance - b.attendance)[0];
  const topPerformer = [...activity].sort(
    (a, b) =>
      b.tasksCompleted + b.adsCount + b.crmCount -
      (a.tasksCompleted + a.adsCount + a.crmCount)
  )[0];

  insights.push({
    id: "rate",
    tone: stats.attendanceRate >= 90 ? "good" : "warn",
    titleKey: "analytics.insightRateTitle",
    bodyKey: "analytics.insightRateBody",
    bodyVars: {
      rate: round1(stats.attendanceRate),
      employees: stats.totalEmployees,
    },
  });

  if (late > 0) {
    insights.push({
      id: "late",
      tone: late > 10 ? "warn" : "info",
      titleKey: "analytics.insightLateTitle",
      bodyKey: "analytics.insightLateBody",
      bodyVars: { count: late },
    });
  }

  if (absent > 0) {
    insights.push({
      id: "absent",
      tone: absent > 8 ? "warn" : "info",
      titleKey: "analytics.insightAbsentTitle",
      bodyKey: "analytics.insightAbsentBody",
      bodyVars: { count: absent },
    });
  }

  if (top) {
    insights.push({
      id: "top-dept",
      tone: "good",
      titleKey: "analytics.insightTopDeptTitle",
      bodyKey: "analytics.insightTopDeptBody",
      bodyVars: { department: top.department, rate: top.attendance },
    });
  }

  if (
    low &&
    top &&
    departments.length > 1 &&
    low.department !== top.department &&
    low.attendance < top.attendance
  ) {
    insights.push({
      id: "low-dept",
      tone: low.attendance < 80 ? "warn" : "info",
      titleKey: "analytics.insightLowDeptTitle",
      bodyKey: "analytics.insightLowDeptBody",
      bodyVars: { department: low.department, rate: low.attendance },
    });
  }

  if (topPerformer) {
    insights.push({
      id: "top-person",
      tone: "good",
      titleKey: "analytics.insightTopPersonTitle",
      bodyKey: "analytics.insightTopPersonBody",
      bodyVars: {
        name: topPerformer.name,
        tasks: topPerformer.tasksCompleted,
        ads: topPerformer.adsCount,
        crm: topPerformer.crmCount,
      },
    });
  }

  return insights.slice(0, 6);
}

export function computeDeptHeatmap(
  attendance: AttendanceRecord[],
  employees: Employee[]
): HeatCell[] {
  const empMap = new Map(employees.map((e) => [e.id, e]));
  const dates = [...new Set(attendance.map((r) => r.date))].sort().slice(-7);
  const depts = [
    ...new Set(
      attendance
        .map((r) => empMap.get(r.employeeId)?.department)
        .filter(Boolean) as string[]
    ),
  ].slice(0, 8);

  const cells: HeatCell[] = [];
  for (const dept of depts) {
    for (const date of dates) {
      const rows = attendance.filter((r) => {
        const emp = empMap.get(r.employeeId);
        return emp?.department === dept && r.date === date;
      });
      const rate = attendanceRateForDay(rows);
      cells.push({
        row: dept,
        col: format(parseISO(date), "dd"),
        level: levelFromRate(rate),
      });
    }
  }
  return cells;
}

export function computeWeekHeatmap(attendance: AttendanceRecord[]): HeatCell[] {
  const dates = [...new Set(attendance.map((r) => r.date))].sort().slice(-7);
  const metrics = [
    { key: "present", match: (r: AttendanceRecord) => r.status === "present" },
    { key: "late", match: (r: AttendanceRecord) => r.status === "late" || r.isLate },
    { key: "absent", match: (r: AttendanceRecord) => r.status === "absent" },
    { key: "wfh", match: (r: AttendanceRecord) => r.status === "wfh" },
  ] as const;

  const cells: HeatCell[] = [];
  for (const metric of metrics) {
    for (const date of dates) {
      const dayRows = attendance.filter((r) => r.date === date);
      const count = dayRows.filter(metric.match).length;
      const rate = pct(count, Math.max(dayRows.length, 1));
      cells.push({
        row: metric.key,
        col: format(parseISO(date), "dd"),
        level: levelFromRate(rate),
      });
    }
  }
  return cells;
}

export function buildAnalyticsBundle(input: {
  stats: DashboardStats;
  attendance: AttendanceRecord[];
  employees: Employee[];
  weekly: WeeklyStat[];
  monthly: MonthlyStat[];
  activity: DailyReportRow[];
  leaveRequests: LeaveRequest[];
}): AnalyticsBundle {
  const departments = computeDeptAnalytics(input.attendance, input.employees);
  const leaveSeries = computeLeaveSeries(input.attendance, input.leaveRequests);
  const summary = summarizeAttendanceRange(input.attendance, input.employees);
  const onLeaveDays = summary.onLeave;
  const pendingCount = input.leaveRequests.filter((r) => r.status === "pending").length;
  const approvedCount = input.leaveRequests.filter((r) => r.status === "approved").length;
  const statsForInsights = {
    ...input.stats,
    present: summary.present,
    late: summary.late,
    absent: summary.absent,
    wfh: summary.wfh,
    onLeave: summary.onLeave,
    attendanceRate: summary.attendanceRate || input.stats.attendanceRate,
    totalEmployees: summary.totalEmployees || input.stats.totalEmployees,
  };

  return {
    executiveKpis: computeExecutiveKpis({
      ...input,
      employees: input.employees,
    }),
    summary,
    departments,
    weeklyTrends: computeTrendsFromAttendance(
      input.attendance,
      "weekly",
      input.weekly
    ),
    monthlyTrends: computeTrendsFromAttendance(input.attendance, "monthly"),
    quarterlyTrends: computeTrendsFromAttendance(input.attendance, "quarterly"),
    leaveSeries,
    modePie: computeModePie(input.attendance),
    radar: computeRadar({ ...input, stats: statsForInsights }),
    insights: computeInsights({
      stats: statsForInsights,
      attendance: input.attendance,
      departments,
      weekly: input.weekly,
      activity: input.activity,
    }),
    deptHeatmap: computeDeptHeatmap(input.attendance, input.employees),
    weekHeatmap: computeWeekHeatmap(input.attendance),
    leaveCards: {
      onLeaveDays,
      leaveSharePct: pct(onLeaveDays, Math.max(input.attendance.length, 1)),
      pendingCount,
      approvedCount,
    },
  };
}

export function defaultReportsRange(days = 30): { from: Date; to: Date } {
  const to = new Date();
  const from = subDays(to, days - 1);
  return { from, to };
}

export function dateKeysInRange(from: Date, to: Date): string[] {
  return eachDayOfInterval({ start: from, end: to }).map((d) =>
    format(d, "yyyy-MM-dd")
  );
}
