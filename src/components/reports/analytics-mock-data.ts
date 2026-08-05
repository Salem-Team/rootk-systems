import { DEPARTMENTS } from "@/constants";
import { sparklineFor } from "@/components/dashboard/dashboard-mock-data";
import type { Department } from "@/types";
import type { SparkPoint } from "@/components/dashboard/dashboard-mock-data";

export type AnalyticsSection =
  | "overview"
  | "attendance"
  | "departments"
  | "performance"
  | "leave"
  | "hours"
  | "late"
  | "absence"
  | "wfh"
  | "trends";

export interface ExecutiveKpi {
  id: string;
  labelKey: string;
  value: number;
  suffix?: string;
  decimals?: number;
  trend: number;
  badgeKey: string;
  tone: string;
  spark: SparkPoint[];
  status: "good" | "warn" | "neutral";
}

export interface DeptAnalyticsRow {
  department: Department;
  attendance: number;
  late: number;
  leave: number;
  productivity: number;
}

export interface TrendPoint {
  label: string;
  attendance: number;
  hours: number;
  late: number;
  overtime: number;
  wfh: number;
  office: number;
  hybrid: number;
}

export interface LeaveAnalyticsPoint {
  label: string;
  utilized: number;
  remaining: number;
  pending: number;
  approved: number;
}

export interface InsightItem {
  id: string;
  tone: "good" | "warn" | "info";
  titleKey: string;
  bodyKey: string;
}

export interface HeatCell {
  row: string;
  col: string;
  level: 0 | 1 | 2 | 3 | 4;
}

export function buildExecutiveKpis(): ExecutiveKpi[] {
  return [
    {
      id: "rate",
      labelKey: "analytics.kpiAttendanceRate",
      value: 94.2,
      suffix: "%",
      decimals: 1,
      trend: 1.8,
      badgeKey: "analytics.vsLastMonth",
      tone: "text-emerald-700 dark:text-emerald-400",
      spark: sparklineFor("rate"),
      status: "good",
    },
    {
      id: "hours",
      labelKey: "analytics.kpiAvgHours",
      value: 8.4,
      suffix: "h",
      decimals: 1,
      trend: 0.3,
      badgeKey: "analytics.vsLastWeek",
      tone: "text-teal-800 dark:text-teal-300",
      spark: sparklineFor("hours"),
      status: "good",
    },
    {
      id: "late",
      labelKey: "analytics.kpiLateRate",
      value: 6.1,
      suffix: "%",
      decimals: 1,
      trend: -0.8,
      badgeKey: "analytics.improving",
      tone: "text-amber-700 dark:text-amber-400",
      spark: sparklineFor("late"),
      status: "warn",
    },
    {
      id: "absent",
      labelKey: "analytics.kpiAbsenceRate",
      value: 3.4,
      suffix: "%",
      decimals: 1,
      trend: -0.4,
      badgeKey: "analytics.vsLastMonth",
      tone: "text-rose-700 dark:text-rose-400",
      spark: sparklineFor("absent"),
      status: "good",
    },
    {
      id: "leave",
      labelKey: "analytics.kpiLeaveUtil",
      value: 62,
      suffix: "%",
      decimals: 0,
      trend: 4,
      badgeKey: "analytics.ytd",
      tone: "text-violet-700 dark:text-violet-300",
      spark: sparklineFor("leave"),
      status: "neutral",
    },
    {
      id: "efficiency",
      labelKey: "analytics.kpiDeptEfficiency",
      value: 88,
      suffix: "%",
      decimals: 0,
      trend: 2.1,
      badgeKey: "analytics.vsTarget",
      tone: "text-primary",
      spark: sparklineFor("eff"),
      status: "good",
    },
    {
      id: "productivity",
      labelKey: "analytics.kpiProductivity",
      value: 91.5,
      suffix: "%",
      decimals: 1,
      trend: 1.2,
      badgeKey: "analytics.monthly",
      tone: "text-sky-700 dark:text-sky-300",
      spark: sparklineFor("prod"),
      status: "good",
    },
    {
      id: "wfh",
      labelKey: "analytics.kpiWfhRatio",
      value: 18.5,
      suffix: "%",
      decimals: 1,
      trend: 2.5,
      badgeKey: "analytics.vsLastMonth",
      tone: "text-sky-700 dark:text-sky-400",
      spark: sparklineFor("wfh"),
      status: "neutral",
    },
  ];
}

export function buildDeptAnalytics(): DeptAnalyticsRow[] {
  return DEPARTMENTS.map((department, i) => ({
    department,
    attendance: 86 + ((i * 3) % 12),
    late: 3 + (i % 7),
    leave: 4 + ((i * 2) % 8),
    productivity: 80 + ((i * 5) % 18),
  })).sort((a, b) => b.attendance - a.attendance);
}

export function buildWeeklyTrends(): TrendPoint[] {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days.map((label, i) => {
    const weekend = label === "Fri" || label === "Sat";
    return {
      label,
      attendance: weekend ? 12 : 88 + (i % 5),
      hours: weekend ? 1 : 7.5 + (i % 3) * 0.4,
      late: weekend ? 0 : 2 + (i % 4),
      overtime: weekend ? 0 : (i % 3) * 0.6,
      wfh: weekend ? 2 : 8 + (i % 4),
      office: weekend ? 5 : 55 + (i % 8),
      hybrid: weekend ? 1 : 12 + (i % 5),
    };
  });
}

export function buildMonthlyTrends(): TrendPoint[] {
  const months = ["Mar", "Apr", "May", "Jun", "Jul", "Aug"];
  return months.map((label, i) => ({
    label,
    attendance: 88 + (i % 6),
    hours: 7.8 + i * 0.1,
    late: 8 - (i % 4),
    overtime: 2 + (i % 3) * 0.5,
    wfh: 12 + i,
    office: 70 - i,
    hybrid: 14 + (i % 4),
  }));
}

export function buildQuarterlyTrends(): TrendPoint[] {
  return ["Q1", "Q2", "Q3", "Q4"].map((label, i) => ({
    label,
    attendance: 90 + i,
    hours: 8 + i * 0.15,
    late: 7 - i,
    overtime: 2.2 + i * 0.3,
    wfh: 10 + i * 3,
    office: 72 - i * 4,
    hybrid: 12 + i * 2,
  }));
}

export function buildLeaveAnalytics(): LeaveAnalyticsPoint[] {
  return ["Mar", "Apr", "May", "Jun", "Jul", "Aug"].map((label, i) => ({
    label,
    utilized: 18 + i * 3,
    remaining: 40 - i * 2,
    pending: 2 + (i % 3),
    approved: 12 + i * 2,
  }));
}

export function buildModePie() {
  return [
    { nameKey: "analytics.modeOffice", value: 64, fill: "var(--primary)" },
    { nameKey: "analytics.modeHybrid", value: 18, fill: "var(--chart-2)" },
    { nameKey: "analytics.modeRemote", value: 18, fill: "var(--chart-1)" },
  ];
}

export function buildRadarScores() {
  return [
    { subjectKey: "analytics.radarAttendance", score: 92 },
    { subjectKey: "analytics.radarPunctuality", score: 84 },
    { subjectKey: "analytics.radarHours", score: 88 },
    { subjectKey: "analytics.radarLeave", score: 76 },
    { subjectKey: "analytics.radarWfh", score: 70 },
    { subjectKey: "analytics.radarOvertime", score: 62 },
  ];
}

export function buildInsights(): InsightItem[] {
  return [
    {
      id: "i1",
      tone: "good",
      titleKey: "analytics.insightTopDeptTitle",
      bodyKey: "analytics.insightTopDeptBody",
    },
    {
      id: "i2",
      tone: "warn",
      titleKey: "analytics.insightLateTitle",
      bodyKey: "analytics.insightLateBody",
    },
    {
      id: "i3",
      tone: "good",
      titleKey: "analytics.insightPerfectTitle",
      bodyKey: "analytics.insightPerfectBody",
    },
    {
      id: "i4",
      tone: "info",
      titleKey: "analytics.insightStaffingTitle",
      bodyKey: "analytics.insightStaffingBody",
    },
  ];
}

export function buildDeptHeatmap(): HeatCell[] {
  const cols = ["Sun", "Mon", "Tue", "Wed", "Thu"];
  const cells: HeatCell[] = [];
  DEPARTMENTS.slice(0, 6).forEach((dept, ri) => {
    cols.forEach((col, ci) => {
      cells.push({
        row: dept,
        col,
        level: ((ri + ci * 2) % 5) as 0 | 1 | 2 | 3 | 4,
      });
    });
  });
  return cells;
}

export function buildWeekHeatmap(): HeatCell[] {
  const cols = ["W1", "W2", "W3", "W4"];
  const rows = [
    "heatRowAttendance",
    "heatRowLate",
    "heatRowWfh",
    "heatRowLeave",
  ];
  const cells: HeatCell[] = [];
  rows.forEach((row, ri) => {
    cols.forEach((col, ci) => {
      cells.push({
        row,
        col,
        level: ((ri * 2 + ci) % 5) as 0 | 1 | 2 | 3 | 4,
      });
    });
  });
  return cells;
}
