"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Gauge, Plane } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/loading-state";
import { KpiCard } from "@/components/dashboard/kpi-card";
import {
  attendanceStreak,
  personalMonthlyScore,
  sparklineFor,
} from "@/components/dashboard/dashboard-mock-data";
import { StatusBadge } from "@/components/shared/status-badge";
import { PortalSectionNav } from "@/components/portal/portal-section-nav";
import { PortalProfilePanel } from "@/components/portal/portal-profile-panel";
import {
  PortalAchievementsPanel,
  PortalAttendancePanel,
  PortalDocumentsPanel,
  PortalEventsPanel,
  PortalLeavePanel,
  PortalManagerPanel,
  PortalNotificationsPanel,
  PortalRequestsPanel,
  PortalStatsPanel,
  PortalTeamPanel,
  PortalTimelinePanel,
} from "@/components/portal/portal-panels";
import { EmployeeDailyWorkspace } from "@/components/operations/employee-daily-workspace";
import { EmployeeOverviewHero } from "@/components/portal/employee-overview-hero";
import type { PortalSection } from "@/components/portal/portal-mock-data";
import { getAnnouncements } from "@/services/dashboard.service";
import { getMyLeaveRequests } from "@/services/leave.service";
import { getHolidays } from "@/services/schedule.service";
import { getWorkforceEmployees } from "@/services/employees.service";
import {
  getWorkEmployeeIdFromUser,
  useSessionStore,
} from "@/stores/session-store";
import { useAttendanceStore } from "@/stores/attendance-store";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { computeLeaveBalance } from "@/lib/leave-balance";
import { demoNow } from "@/lib/mock-date";
import type {
  Announcement,
  AttendanceRecord,
  Employee,
  Holiday,
  LeaveRequest,
} from "@/types";

const VALID_SECTIONS = new Set<PortalSection>([
  "overview",
  "profile",
  "attendance",
  "leave",
  "requests",
  "documents",
  "notifications",
  "team",
  "manager",
  "timeline",
  "events",
  "achievements",
  "stats",
]);

function parseSection(raw: string | null): PortalSection {
  if (raw && VALID_SECTIONS.has(raw as PortalSection)) {
    return raw as PortalSection;
  }
  return "overview";
}

export function EmployeePortalWorkspace() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateLocale = locale === "ar" ? arLocale : enUS;
  const user = useSessionStore((s) => s.user);
  const workEmployeeId = useSessionStore((s) =>
    getWorkEmployeeIdFromUser(s.user)
  );
  const todayRecord = useAttendanceStore((s) => s.todayRecord);
  const fetchTodayRecord = useAttendanceStore((s) => s.fetchTodayRecord);

  const [section, setSection] = useState<PortalSection>(() =>
    parseSection(searchParams.get("section"))
  );
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [roster, setRoster] = useState<Employee[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSection(parseSection(searchParams.get("section")));
  }, [searchParams]);

  useEffect(() => {
    let mounted = true;
    setReady(false);
    void (async () => {
      try {
        await fetchTodayRecord(workEmployeeId);
        const [annRes, leaveRes, holRes, empRes] = await Promise.all([
          getAnnouncements(),
          getMyLeaveRequests(workEmployeeId),
          getHolidays(),
          getWorkforceEmployees(),
        ]);
        if (!mounted) return;
        if (annRes.success) setAnnouncements(annRes.data.slice(0, 5));
        if (leaveRes.success) setLeaves(leaveRes.data);
        if (holRes.success) setHolidays(holRes.data);
        if (empRes.success) setRoster(empRes.data);
      } finally {
        if (mounted) setReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [fetchTodayRecord, workEmployeeId]);

  const me = useMemo((): Employee => {
    const found = roster.find((e) => e.id === workEmployeeId);
    if (found) return found;
    return {
      id: workEmployeeId,
      employeeId: user.employeeId,
      name: user.displayName || user.firstName || user.email,
      email: user.email,
      phone: "+20 100 000 0000",
      department: "Engineering",
      position: "Employee",
      status: "active",
      joinDate: "2024-01-15",
      location: "Cairo",
      companyId: "rootk",
      createdAt: "",
      updatedAt: "",
      createdBy: "",
      updatedBy: "",
      deletedAt: null,
      isArchived: false,
      version: 1,
      metadata: {},
    };
  }, [roster, workEmployeeId, user]);

  const manager = useMemo(() => {
    if (!me.manager) return null;
    return roster.find((e) => e.name === me.manager) ?? null;
  }, [me, roster]);

  const teammates = useMemo(() => {
    return roster.filter(
      (e) =>
        e.id !== me.id &&
        (e.manager === me.manager ||
          e.department === me.department ||
          e.manager === me.name)
    );
  }, [me, roster]);

  const balance = useMemo(() => computeLeaveBalance(leaves), [leaves]);
  const streak = useMemo(
    () => attendanceStreak(workEmployeeId),
    [workEmployeeId]
  );
  const score = useMemo(
    () => personalMonthlyScore(workEmployeeId),
    [workEmployeeId]
  );

  function changeSection(next: PortalSection) {
    setSection(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === "overview") params.delete("section");
    else params.set("section", next);
    const qs = params.toString();
    router.replace(qs ? `/dashboard?${qs}` : "/dashboard", { scroll: false });
  }

  if (!ready) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="hidden sm:block">
        <PageHeader
          className="mb-4 sm:mb-7"
          eyebrow={t("portal.eyebrow")}
          title={t("portal.welcome", { name: user.firstName || user.displayName })}
          description={t("portal.description")}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[232px_minmax(0,1fr)] lg:gap-6">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <PortalSectionNav active={section} onChange={changeSection} />
        </aside>

        <div className="min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={section}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-4 sm:space-y-6"
            >
              {section === "overview" && (
                <OverviewHome
                  streak={streak}
                  score={score}
                  balance={balance}
                  todayRecord={todayRecord}
                  dateLocale={dateLocale}
                  announcements={announcements}
                  holidays={holidays}
                  leaves={leaves}
                  employees={roster}
                  manager={manager}
                  teammates={teammates}
                />
              )}
              {section === "profile" && <PortalProfilePanel employee={me} />}
              {section === "attendance" && (
                <PortalAttendancePanel employee={me} />
              )}
              {section === "leave" && (
                <PortalLeavePanel leaves={leaves} employee={me} />
              )}
              {section === "requests" && <PortalRequestsPanel />}
              {section === "documents" && <PortalDocumentsPanel />}
              {section === "notifications" && <PortalNotificationsPanel />}
              {section === "team" && (
                <PortalTeamPanel manager={manager} teammates={teammates} />
              )}
              {section === "manager" && (
                <PortalManagerPanel manager={manager} />
              )}
              {section === "timeline" && <PortalTimelinePanel />}
              {section === "events" && <PortalEventsPanel />}
              {section === "achievements" && <PortalAchievementsPanel />}
              {section === "stats" && <PortalStatsPanel employee={me} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function OverviewHome({
  streak,
  score,
  balance,
  todayRecord,
  dateLocale,
  announcements,
  holidays,
  leaves,
  employees,
}: {
  streak: number;
  score: number;
  balance: { remaining: number; used: number; pending: number };
  todayRecord: AttendanceRecord | null;
  dateLocale: typeof enUS;
  announcements: Announcement[];
  holidays: Holiday[];
  leaves: LeaveRequest[];
  employees: Employee[];
  manager: Employee | null;
  teammates: Employee[];
}) {
  const { t } = useTranslation();

  return (
    <>
      <EmployeeOverviewHero
        streak={streak}
        score={score}
        leaveRemaining={balance.remaining}
        todayRecord={todayRecord}
      />

      <motion.div
        variants={staggerContainer}
        initial={false}
        animate="visible"
        className="hidden grid-cols-2 gap-3 sm:grid xl:grid-cols-4"
      >
        <motion.div variants={fadeInUp}>
          <KpiCard
            label={t("employeeHome.attendanceStreak")}
            value={streak}
            icon={Flame}
            tone="text-orange-700 dark:text-orange-400"
            spark={sparklineFor(`streak-portal`)}
            badge={t("employeeHome.days")}
          />
        </motion.div>
        <motion.div variants={fadeInUp}>
          <KpiCard
            label={t("employeeHome.monthlyScore")}
            value={score}
            suffix="%"
            icon={Gauge}
            tone="text-teal-800 dark:text-teal-300"
            spark={sparklineFor(`score-portal`)}
            trend={2}
          />
        </motion.div>
        <motion.div variants={fadeInUp}>
          <KpiCard
            label={t("employeeHome.leaveRemaining")}
            value={balance.remaining}
            icon={Plane}
            tone="text-sky-700 dark:text-sky-400"
            spark={sparklineFor(`leave-portal`)}
          />
        </motion.div>
        <motion.div
          variants={fadeInUp}
          className="surface-panel flex flex-col justify-between px-4 py-3.5"
        >
          <p className="section-label">{t("employeeHome.myStatus")}</p>
          <div className="mt-2">
            {todayRecord ? (
              <StatusBadge status={todayRecord.status} />
            ) : (
              <span className="text-sm text-muted-foreground">
                {t("attendance.notCheckedIn")}
              </span>
            )}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {format(demoNow(), "EEEE, MMM d", { locale: dateLocale })}
          </p>
        </motion.div>
      </motion.div>

      <EmployeeDailyWorkspace
        todayRecord={todayRecord}
        announcements={announcements}
        holidays={holidays}
        leaves={leaves}
        employees={employees}
      />
    </>
  );
}

