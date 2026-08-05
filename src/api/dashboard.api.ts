import { api } from "@/api/http";
import { API_ROUTES, toQuery } from "@/api/routes";
import type {
  Activity,
  Announcement,
  ApiResponse,
  DashboardStats,
  MonthlyStat,
  WeeklyStat,
} from "@/types";

const EMPTY_STATS: DashboardStats = {
  present: 0,
  absent: 0,
  late: 0,
  wfh: 0,
  onLeave: 0,
  attendanceRate: 0,
  totalEmployees: 0,
};

export type DashboardSummary = {
  stats: DashboardStats;
  weekly: WeeklyStat[];
  monthly: MonthlyStat[];
  activities: Activity[];
  announcements: Announcement[];
  pendingLeaveCount: number;
};

/** GET /dashboard/stats */
export function fetchDashboardStats(): Promise<ApiResponse<DashboardStats>> {
  return api.get(API_ROUTES.dashboard.stats, EMPTY_STATS);
}

/** GET /dashboard/summary */
export function fetchDashboardSummary(): Promise<
  ApiResponse<DashboardSummary>
> {
  return api.get(API_ROUTES.dashboard.summary, {
    stats: EMPTY_STATS,
    weekly: [],
    monthly: [],
    activities: [],
    announcements: [],
    pendingLeaveCount: 0,
  });
}

/** GET /reports/weekly */
export function fetchWeeklyStats(): Promise<ApiResponse<WeeklyStat[]>> {
  return api.getList(API_ROUTES.reports.weekly);
}

/** GET /reports/monthly */
export function fetchMonthlyStats(): Promise<ApiResponse<MonthlyStat[]>> {
  return api.getList(API_ROUTES.reports.monthly);
}

/** GET /activities */
export function fetchActivities(
  limit = 20
): Promise<ApiResponse<Activity[]>> {
  return api.getList(`${API_ROUTES.activities.root}${toQuery({ limit })}`);
}

/** GET /announcements */
export function fetchAnnouncements(
  priority?: Announcement["priority"]
): Promise<ApiResponse<Announcement[]>> {
  return api.getList(
    `${API_ROUTES.announcements.root}${toQuery({ priority })}`
  );
}
