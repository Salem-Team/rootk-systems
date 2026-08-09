import { api } from "@/api/http";
import { API_ROUTES, toQuery } from "@/api/routes";
import { ensureActivities } from "@/lib/activity-normalize";
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
export async function fetchDashboardSummary(): Promise<
  ApiResponse<DashboardSummary>
> {
  const res = await api.get(API_ROUTES.dashboard.summary, {
    stats: EMPTY_STATS,
    weekly: [],
    monthly: [],
    activities: [],
    announcements: [],
    pendingLeaveCount: 0,
  });
  return {
    ...res,
    data: {
      ...res.data,
      activities: ensureActivities(res.data?.activities),
      weekly: Array.isArray(res.data?.weekly) ? res.data.weekly : [],
      monthly: Array.isArray(res.data?.monthly) ? res.data.monthly : [],
      announcements: Array.isArray(res.data?.announcements)
        ? res.data.announcements
        : [],
      stats: res.data?.stats ?? EMPTY_STATS,
      pendingLeaveCount: res.data?.pendingLeaveCount ?? 0,
    },
  };
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
export async function fetchActivities(
  limit = 20
): Promise<ApiResponse<Activity[]>> {
  const res = await api.getList(
    `${API_ROUTES.activities.root}${toQuery({ limit })}`
  );
  return { ...res, data: ensureActivities(res.data) };
}

/** GET /announcements */
export function fetchAnnouncements(
  priority?: Announcement["priority"]
): Promise<ApiResponse<Announcement[]>> {
  return api.getList(
    `${API_ROUTES.announcements.root}${toQuery({ priority })}`
  );
}
