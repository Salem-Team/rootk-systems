"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { PageTransition } from "@/components/shared/page-transition";
import { PageSkeleton } from "@/components/shared/loading-state";
import { MobileSegmentedTabs } from "@/components/shared/mobile-segmented-tabs";
import { CheckInPanel } from "@/components/attendance/check-in-panel";
import { AttendanceSideRail } from "@/components/attendance/attendance-side-rail";
import { AttendanceHistory } from "@/components/attendance/attendance-history";
import { AttendanceEmployeePicker } from "@/components/attendance/attendance-employee-picker";
import { TeamAttendanceBoard } from "@/components/attendance/team-attendance-board";
import { MonthlyAnalytics } from "@/components/attendance/monthly-analytics";
import { AttendanceCalendar } from "@/components/attendance/attendance-calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getEmployeeAttendance } from "@/services/attendance.service";
import { getWorkforceEmployees } from "@/services/employees.service";
import { useAttendanceStore } from "@/stores/attendance-store";
import {
  getWorkEmployeeIdFromUser,
  useSessionStore,
} from "@/stores/session-store";
import { useHasAnyPermission } from "@/hooks/use-permission";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import type { AttendanceRecord, Employee } from "@/types";

export default function AttendancePage() {
  const { t } = useTranslation();
  const workEmployeeId = useSessionStore((s) =>
    getWorkEmployeeIdFromUser(s.user)
  );
  const canViewTeamBoard = useHasAnyPermission([
    "attendance.viewAll",
    "attendance.viewTeam",
  ]);
  const fetchTodayRecord = useAttendanceStore((s) => s.fetchTodayRecord);
  const todayRecord = useAttendanceStore((s) => s.todayRecord);
  const isLoadingToday = useAttendanceStore((s) => s.isLoading);
  const [viewEmployeeId, setViewEmployeeId] = useState(workEmployeeId);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [ownHistory, setOwnHistory] = useState<AttendanceRecord[]>([]);
  const [viewHistory, setViewHistory] = useState<AttendanceRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [mobileTab, setMobileTab] = useState("today");

  useEffect(() => {
    setViewEmployeeId(workEmployeeId);
  }, [workEmployeeId]);

  useEffect(() => {
    if (!canViewTeamBoard) return;
    let mounted = true;
    void getWorkforceEmployees().then((res) => {
      if (!mounted || !res.success) return;
      setEmployees(
        [...res.data].sort((a, b) => a.name.localeCompare(b.name))
      );
    });
    return () => {
      mounted = false;
    };
  }, [canViewTeamBoard]);

  const loadOwnHistory = useCallback(async () => {
    const res = await getEmployeeAttendance(workEmployeeId);
    if (res.success) setOwnHistory(res.data);
    else setOwnHistory([]);
  }, [workEmployeeId]);

  const loadViewHistory = useCallback(async (employeeId: string) => {
    setHistoryLoading(true);
    const res = await getEmployeeAttendance(employeeId);
    if (res.success) setViewHistory(res.data);
    else setViewHistory([]);
    setHistoryLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;
    setReady(false);
    (async () => {
      await fetchTodayRecord(workEmployeeId);
      await loadOwnHistory();
      if (mounted) setReady(true);
    })();
    return () => {
      mounted = false;
    };
  }, [fetchTodayRecord, loadOwnHistory, workEmployeeId]);

  useEffect(() => {
    void loadViewHistory(viewEmployeeId);
  }, [loadViewHistory, viewEmployeeId]);

  useEffect(() => {
    if (!ready) return;
    void loadOwnHistory();
    if (viewEmployeeId === workEmployeeId) {
      void loadViewHistory(workEmployeeId);
    }
  }, [
    ready,
    loadOwnHistory,
    loadViewHistory,
    viewEmployeeId,
    workEmployeeId,
    todayRecord?.checkIn,
    todayRecord?.checkOut,
    todayRecord?.status,
    todayRecord?.workingMinutes,
  ]);

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === viewEmployeeId) ?? null,
    [employees, viewEmployeeId]
  );

  const selectEmployee = useCallback((employeeId: string) => {
    setViewEmployeeId(employeeId);
    if (typeof document !== "undefined") {
      document
        .getElementById("attendance-insights")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  if (!ready && (isLoadingToday || historyLoading)) {
    return <PageSkeleton />;
  }

  const employeePicker = canViewTeamBoard ? (
    <AttendanceEmployeePicker
      employees={employees}
      value={viewEmployeeId}
      onChange={selectEmployee}
      disabled={employees.length === 0}
    />
  ) : null;

  const insightsHeading =
    canViewTeamBoard && selectedEmployee
      ? t("attendance.viewHistoryFor", { name: selectedEmployee.name })
      : t("attendance.moreInsights");

  const primarySection = (
    <div className="grid gap-4 sm:gap-5 xl:grid-cols-12">
      <div className="xl:col-span-7">
        <CheckInPanel />
      </div>
      <div className="xl:col-span-5">
        <AttendanceSideRail history={ownHistory} />
      </div>
    </div>
  );

  const moreSection = (
    <div className="space-y-4 sm:space-y-5">
      {employeePicker}
      <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
        <AttendanceCalendar records={viewHistory} />
        <MonthlyAnalytics records={viewHistory} />
      </div>
      <AttendanceHistory
        records={viewHistory}
        loading={historyLoading && !ready}
      />
    </div>
  );

  const employeeMobileTabs = (
    [
      ["today", "attendance.mobileTabToday"],
      ["more", "attendance.mobileTabMore"],
      ["history", "attendance.mobileTabHistory"],
    ] as const
  );

  const teamMobileTabs = (
    [
      ["today", "attendance.mobileTabCheckIn"],
      ["team", "attendance.mobileTabTeam"],
      ["more", "attendance.mobileTabMore"],
    ] as const
  );

  const mobileTabs = canViewTeamBoard ? teamMobileTabs : employeeMobileTabs;

  return (
    <PageTransition>
      <PageHeader
        className="mb-3 sm:mb-6"
        title={t("attendance.title")}
        description={
          canViewTeamBoard
            ? t("attendance.teamBoardDesc")
            : t("attendance.description")
        }
      />

      {/* Mobile app segmented views */}
      <div className="lg:hidden">
        <Tabs
          value={mobileTab}
          onValueChange={setMobileTab}
          className="space-y-4"
        >
          <MobileSegmentedTabs>
            <TabsList
              className={cn(
                "grid h-auto w-full gap-1 rounded-xl border border-border/60 bg-card p-1 shadow-sm",
                mobileTabs.length === 3 ? "grid-cols-3" : "grid-cols-2"
              )}
            >
              {mobileTabs.map(([value, label]) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="min-h-11 touch-manipulation truncate rounded-lg px-1.5 py-2 text-[12px] font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
                >
                  {t(label)}
                </TabsTrigger>
              ))}
            </TabsList>
          </MobileSegmentedTabs>

          <TabsContent value="today" className="mt-0 space-y-4">
            {primarySection}
          </TabsContent>

          {canViewTeamBoard ? (
            <TabsContent value="team" className="mt-0 space-y-4">
              <TeamAttendanceBoard
                selectedEmployeeId={viewEmployeeId}
                onSelectEmployee={(id) => {
                  selectEmployee(id);
                  setMobileTab("more");
                }}
              />
            </TabsContent>
          ) : null}

          <TabsContent value="more" className="mt-0 space-y-4">
            {canViewTeamBoard ? employeePicker : null}
            <AttendanceCalendar records={viewHistory} />
            <MonthlyAnalytics records={viewHistory} />
            {!canViewTeamBoard ? null : (
              <AttendanceHistory
                records={viewHistory}
                loading={historyLoading && !ready}
              />
            )}
          </TabsContent>

          {!canViewTeamBoard ? (
            <TabsContent value="history" className="mt-0 space-y-4">
              <AttendanceHistory
                records={viewHistory}
                loading={historyLoading && !ready}
              />
            </TabsContent>
          ) : null}
        </Tabs>
      </div>

      {/* Desktop / large tablet stack */}
      <div className="hidden space-y-6 sm:space-y-8 lg:block">
        {primarySection}
        {canViewTeamBoard ? (
          <TeamAttendanceBoard
            selectedEmployeeId={viewEmployeeId}
            onSelectEmployee={selectEmployee}
          />
        ) : null}
        <section
          id="attendance-insights"
          aria-label={t("attendance.moreInsights")}
          className="scroll-mt-20 space-y-3"
        >
          <h2 className="px-0.5 text-sm font-semibold tracking-tight text-muted-foreground">
            {insightsHeading}
          </h2>
          {moreSection}
        </section>
      </div>
    </PageTransition>
  );
}
