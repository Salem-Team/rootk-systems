import {
  fetchActivities,
  fetchAnnouncements,
  fetchDashboardStats,
  fetchDashboardSummary,
  fetchMonthlyStats,
  fetchWeeklyStats,
} from "@/api/dashboard.api";
import { ensureActivities } from "@/lib/activity-normalize";
import { isApiMode } from "@/lib/env";
import { todayKey } from "@/lib/mock-date";
import {
  activityRepository,
  announcementRepository,
  attendanceRepository,
  employeeRepository,
  leaveRepository,
  reportRepository,
} from "@/repositories";
import { fromError, ok } from "@/services/api-result";
import { simulateDelay } from "@/services/fake-api";
import type {
  Activity,
  Announcement,
  ApiResponse,
  DashboardStats,
  MonthlyStat,
  WeeklyStat,
} from "@/types";

async function computeDashboardStats(): Promise<DashboardStats> {
  const today = todayKey();
  const [attendance, employees] = await Promise.all([
    attendanceRepository.list(),
    employeeRepository.list(),
  ]);

  const todayRecords = attendance.filter((r) => r.date === today);
  const byEmployee = new Map(todayRecords.map((r) => [r.employeeId, r]));
  const activeEmployees = employees.filter((e) => e.status !== "inactive");

  let present = 0;
  let absent = 0;
  let late = 0;
  let wfh = 0;
  let onLeave = 0;
  let earlyLeave = 0;

  for (const emp of activeEmployees) {
    const record = byEmployee.get(emp.id);
    const status =
      record?.status ??
      (emp.status === "on_leave" ? "on_leave" : "absent");
    switch (status) {
      case "present":
      case "half_day":
        present += 1;
        break;
      case "early_leave":
        earlyLeave += 1;
        break;
      case "late":
        late += 1;
        break;
      case "wfh":
        wfh += 1;
        break;
      case "on_leave":
        onLeave += 1;
        break;
      default:
        absent += 1;
        break;
    }
  }

  const attended = present + late + wfh + earlyLeave;
  const rateBase = activeEmployees.length || 1;
  const attendanceRate = Math.round((attended / rateBase) * 1000) / 10;

  return {
    present: present + earlyLeave,
    absent,
    late,
    wfh,
    onLeave,
    attendanceRate,
    totalEmployees: activeEmployees.length,
  };
}

/** GET /dashboard/stats */
export async function getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
  if (isApiMode()) return fetchDashboardStats();
  try {
    await simulateDelay();
    return ok(await computeDashboardStats());
  } catch (error) {
    return fromError(error, {
      present: 0,
      absent: 0,
      late: 0,
      wfh: 0,
      onLeave: 0,
      attendanceRate: 0,
      totalEmployees: 0,
    });
  }
}

/** GET /reports/weekly */
export async function getWeeklyStats(): Promise<ApiResponse<WeeklyStat[]>> {
  if (isApiMode()) return fetchWeeklyStats();
  try {
    return ok(await reportRepository.getWeeklyStats());
  } catch (error) {
    return fromError(error, []);
  }
}

/** GET /reports/monthly */
export async function getMonthlyStats(): Promise<ApiResponse<MonthlyStat[]>> {
  if (isApiMode()) return fetchMonthlyStats();
  try {
    return ok(await reportRepository.getMonthlyStats());
  } catch (error) {
    return fromError(error, []);
  }
}

/** GET /activities */
export async function getActivities(
  limit = 20
): Promise<ApiResponse<Activity[]>> {
  if (isApiMode()) return fetchActivities(limit);
  try {
    return ok(ensureActivities(await activityRepository.latest(limit)));
  } catch (error) {
    return fromError(error, []);
  }
}

/** GET /announcements */
export async function getAnnouncements(
  priority?: Announcement["priority"]
): Promise<ApiResponse<Announcement[]>> {
  if (isApiMode()) return fetchAnnouncements(priority);
  try {
    return ok(await announcementRepository.list(priority));
  } catch (error) {
    return fromError(error, []);
  }
}

/** GET /dashboard/summary */
export async function getDashboardSummary(): Promise<
  ApiResponse<{
    stats: DashboardStats;
    weekly: WeeklyStat[];
    monthly: MonthlyStat[];
    activities: Activity[];
    announcements: Announcement[];
    pendingLeaveCount: number;
  }>
> {
  if (isApiMode()) return fetchDashboardSummary();
  try {
    await simulateDelay();
    const [stats, weekly, monthly, activities, announcements, leave] =
      await Promise.all([
        computeDashboardStats(),
        reportRepository.getWeeklyStats(),
        reportRepository.getMonthlyStats(),
        activityRepository.latest(10),
        announcementRepository.list(),
        leaveRepository.list(),
      ]);

    return ok({
      stats,
      weekly,
      monthly,
      activities: ensureActivities(activities),
      announcements: announcements.slice(0, 5),
      pendingLeaveCount: leave.filter((r) => r.status === "pending").length,
    });
  } catch (error) {
    return fromError(error, {
      stats: {
        present: 0,
        absent: 0,
        late: 0,
        wfh: 0,
        onLeave: 0,
        attendanceRate: 0,
        totalEmployees: 0,
      },
      weekly: [],
      monthly: [],
      activities: [],
      announcements: [],
      pendingLeaveCount: 0,
    });
  }
}
