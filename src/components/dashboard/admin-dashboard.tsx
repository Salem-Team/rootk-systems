"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/loading-state";
import { EmptyState } from "@/components/shared/empty-state";
import { Reveal } from "@/components/shared/reveal";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { Announcements } from "@/components/dashboard/announcements";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { TodaySnapshot } from "@/components/dashboard/today-snapshot";
import { DepartmentComparison } from "@/components/dashboard/department-comparison";
import { TopDepartments } from "@/components/dashboard/top-departments";
import { CompanyCalendarMini } from "@/components/dashboard/company-calendar-mini";
import {
  BirthdaysPanel,
  HolidaysPanel,
} from "@/components/dashboard/holidays-birthdays";
import { RecentLeavePanel } from "@/components/dashboard/recent-leave-panel";
import { DashboardNotifications } from "@/components/dashboard/dashboard-notifications";
import { AdminOperationsWorkspace } from "@/components/operations/admin-operations-workspace";
import {
  buildBirthdays,
  buildCompanyCalendarEvents,
  buildDepartmentStats,
} from "@/components/dashboard/dashboard-mock-data";
import { Skeleton } from "@/components/ui/skeleton";
import { getDashboardSummary } from "@/services/dashboard.service";
import { getWorkforceEmployees } from "@/services/employees.service";
import { getTodayAttendance } from "@/services/attendance.service";
import { getLeaveRequests } from "@/services/leave.service";
import { getHolidays } from "@/services/schedule.service";
import { useTranslation } from "@/hooks/use-translation";
import type {
  Activity,
  Announcement,
  AttendanceRecord,
  DashboardStats,
  Employee,
  Holiday,
  LeaveRequest,
  MonthlyStat,
  WeeklyStat,
} from "@/types";

const WeeklyChart = dynamic(
  () =>
    import("@/components/dashboard/weekly-chart").then((m) => m.WeeklyChart),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[400px] rounded-xl" />,
  }
);

const MonthlyChart = dynamic(
  () =>
    import("@/components/dashboard/monthly-chart").then((m) => m.MonthlyChart),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[360px] rounded-xl" />,
  }
);

export function AdminDashboard() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [weekly, setWeekly] = useState<WeeklyStat[]>([]);
  const [monthly, setMonthly] = useState<MonthlyStat[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [dash, emp, att, leave, hol] = await Promise.all([
          getDashboardSummary(),
          getWorkforceEmployees(),
          getTodayAttendance(),
          getLeaveRequests(),
          getHolidays(),
        ]);
        if (!mounted) return;
        if (dash.success) {
          setStats(dash.data.stats);
          setWeekly(dash.data.weekly);
          setMonthly(dash.data.monthly);
          setActivities(dash.data.activities);
          setAnnouncements(dash.data.announcements);
        }
        if (emp.success) setEmployees(emp.data);
        if (att.success) setAttendance(att.data);
        if (leave.success) setLeaves(leave.data);
        if (hol.success) setHolidays(hol.data);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const deptStats = useMemo(
    () => buildDepartmentStats(employees, attendance),
    [employees, attendance]
  );
  const birthdays = useMemo(() => buildBirthdays(employees), [employees]);
  const calendarEvents = useMemo(
    () =>
      buildCompanyCalendarEvents({
        holidays,
        leaves,
        birthdays,
      }),
    [holidays, leaves, birthdays]
  );

  if (loading) {
    return <PageSkeleton />;
  }

  if (!stats) {
    return (
      <EmptyState
        title={t("common.error")}
        description={t("dashboard.loadFailed")}
      />
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={t("dashboard.executiveEyebrow")}
        title={t("dashboard.executiveTitle")}
        description={t("dashboard.executiveDesc")}
      />
      <div className="space-y-4 sm:space-y-6">
        <section aria-label={t("dashboard.executiveOverview")}>
          <KpiCards stats={stats} />
        </section>

        <Reveal preset="up" delay={0.04}>
          <AdminOperationsWorkspace
            stats={stats}
            employees={employees}
            attendance={attendance}
            leaves={leaves}
            activities={activities}
          />
        </Reveal>

        <div className="grid gap-4 sm:gap-5 xl:grid-cols-12">
          <div className="space-y-4 sm:space-y-5 xl:col-span-8">
            <Reveal preset="up">
              <TodaySnapshot stats={stats} />
            </Reveal>
            <Reveal preset="up" delay={0.05}>
              <WeeklyChart data={weekly} />
            </Reveal>
            <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
              <Reveal preset="scale">
                <MonthlyChart data={monthly} />
              </Reveal>
              <Reveal preset="scale" delay={0.04}>
                <DepartmentComparison stats={deptStats} />
              </Reveal>
            </div>
          </div>
          <div className="space-y-4 sm:space-y-5 xl:col-span-4">
            <Reveal preset="right">
              <QuickActions variant="admin" />
            </Reveal>
            <Reveal preset="right" delay={0.04}>
              <TopDepartments stats={deptStats} />
            </Reveal>
            <Reveal preset="right" delay={0.08}>
              <Announcements items={announcements} />
            </Reveal>
          </div>
        </div>

        <div className="grid gap-4 sm:gap-5 lg:grid-cols-2 xl:grid-cols-3">
          <Reveal preset="up">
            <ActivityFeed
              activities={activities}
              title={t("dashboard.recentAttendanceEvents")}
              description={t("dashboard.recentAttendanceEventsDesc")}
            />
          </Reveal>
          <Reveal preset="up" delay={0.05}>
            <RecentLeavePanel requests={leaves} />
          </Reveal>
          <Reveal preset="up" delay={0.1}>
            <DashboardNotifications />
          </Reveal>
        </div>

        <div className="grid gap-4 sm:gap-5 lg:grid-cols-2 xl:grid-cols-3">
          <Reveal preset="scale">
            <CompanyCalendarMini events={calendarEvents} />
          </Reveal>
          <Reveal preset="scale" delay={0.05}>
            <HolidaysPanel holidays={holidays} />
          </Reveal>
          <Reveal preset="scale" delay={0.1}>
            <BirthdaysPanel items={birthdays} />
          </Reveal>
        </div>
      </div>
    </>
  );
}
