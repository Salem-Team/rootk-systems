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
  return [];
}

export function buildDeptAnalytics(): DeptAnalyticsRow[] {
  return [];
}

export function buildMonthlyTrends(): TrendPoint[] {
  return [];
}

export function buildWeeklyTrends(): TrendPoint[] {
  return [];
}

export function buildQuarterlyTrends(): TrendPoint[] {
  return [];
}

export function buildLeaveAnalytics(): LeaveAnalyticsPoint[] {
  return [];
}

export function buildModePie(): Array<{
  nameKey: string;
  value: number;
  fill: string;
}> {
  return [];
}

export function buildRadarScores(): Array<{
  subjectKey: string;
  score: number;
}> {
  return [];
}

export function buildInsights(): InsightItem[] {
  return [];
}

export function buildDeptHeatmap(): HeatCell[] {
  return [];
}

export function buildWeekHeatmap(): HeatCell[] {
  return [];
}
