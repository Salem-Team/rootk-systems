"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/shared/loading-state";
import { EmptyState } from "@/components/shared/empty-state";
import { Reveal } from "@/components/shared/reveal";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { EmployeeCallStats } from "@/components/dashboard/employee-call-stats";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { Announcements } from "@/components/dashboard/announcements";
import {
  BirthdaysPanel,
  HolidaysPanel,
} from "@/components/dashboard/holidays-birthdays";
import { RecentLeavePanel } from "@/components/dashboard/recent-leave-panel";
import { CompanyCalendarMini } from "@/components/dashboard/company-calendar-mini";
import { TopDepartments } from "@/components/dashboard/top-departments";
import {
  buildBirthdays,
  buildCompanyCalendarEvents,
  buildDepartmentStats,
} from "@/components/dashboard/dashboard-mock-data";
import { Skeleton } from "@/components/ui/skeleton";
import { getEmployeeActivityReport } from "@/services/daily-report.service";
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
  DailyReportRow,
  DashboardStats,
  Employee,
  Holiday,
  LeaveRequest,
  WeeklyStat,
} from "@/types";

const WeeklyChart = dynamic(
  () =>
    import("@/components/dashboard/weekly-chart").then((m) => m.WeeklyChart),
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
  const [activities, setActivities] = useState<Activity[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [callRows, setCallRows] = useState<DailyReportRow[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [dash, emp, att, leave, hol, calls] = await Promise.all([
          getDashboardSummary(),
          getWorkforceEmployees(),
          getTodayAttendance(),
          getLeaveRequests(),
          getHolidays(),
          getEmployeeActivityReport(),
        ]);
        if (!mounted) return;
        if (dash.success) {
          setStats(dash.data.stats);
          setWeekly(dash.data.weekly);
          setActivities(dash.data.activities ?? []);
          setAnnouncements(dash.data.announcements);
        }
        if (emp.success) setEmployees(emp.data);
        if (att.success) setAttendance(att.data);
        if (leave.success) setLeaves(leave.data);
        if (hol.success) setHolidays(hol.data);
        if (calls.success) setCallRows(calls.data.rows);
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
    <div className="space-y-5 sm:space-y-6">
      <DashboardHero
        present={stats.present + stats.late + stats.wfh}
        totalEmployees={stats.totalEmployees}
      />

      <section aria-label={t("dashboard.executiveOverview")}>
        <KpiCards stats={stats} />
      </section>

      <div className="grid gap-4 sm:gap-5 xl:grid-cols-12">
        <Reveal preset="up" className="xl:col-span-8">
          <WeeklyChart data={weekly} />
        </Reveal>
        <Reveal preset="up" delay={0.04} className="xl:col-span-4">
          <EmployeeCallStats rows={callRows} />
        </Reveal>
      </div>

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-12">
        <Reveal preset="up" className="lg:col-span-7">
          <ActivityFeed
            activities={activities}
            title={t("dashboard.activities")}
            description={t("dashboard.activitiesDesc")}
            viewAllHref="/attendance"
          />
        </Reveal>
        <div className="grid gap-4 sm:gap-5 lg:col-span-5">
          <Reveal preset="up" delay={0.04}>
            <RecentLeavePanel requests={leaves} />
          </Reveal>
          <Reveal preset="up" delay={0.06}>
            <Announcements items={announcements} limit={3} />
          </Reveal>
        </div>
      </div>

      <section
        aria-label={t("dashboard.moreInsights")}
        className="space-y-3"
      >
        <div className="flex items-baseline justify-between gap-3 px-0.5">
          <h2 className="text-sm font-semibold tracking-tight text-muted-foreground">
            {t("dashboard.moreInsights")}
          </h2>
        </div>
        <div className="grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-4">
          <Reveal preset="scale">
            <TopDepartments stats={deptStats} />
          </Reveal>
          <Reveal preset="scale" delay={0.03}>
            <CompanyCalendarMini events={calendarEvents} />
          </Reveal>
          <Reveal preset="scale" delay={0.06}>
            <HolidaysPanel holidays={holidays} />
          </Reveal>
          <Reveal preset="scale" delay={0.09}>
            <BirthdaysPanel items={birthdays} />
          </Reveal>
        </div>
      </section>
    </div>
  );
}
