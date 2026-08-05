"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { PageTransition } from "@/components/shared/page-transition";
import { PageSkeleton } from "@/components/shared/loading-state";
import { CheckInPanel } from "@/components/attendance/check-in-panel";
import { AttendanceTimeline } from "@/components/attendance/attendance-timeline";
import { AttendanceHistory } from "@/components/attendance/attendance-history";
import { TeamAttendanceBoard } from "@/components/attendance/team-attendance-board";
import { WeeklySummary } from "@/components/attendance/weekly-summary";
import { MonthlyAnalytics } from "@/components/attendance/monthly-analytics";
import { AttendanceCalendar } from "@/components/attendance/attendance-calendar";
import { AttendanceHeatmap } from "@/components/attendance/attendance-heatmap";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getEmployeeAttendance } from "@/services/attendance.service";
import { useAttendanceStore } from "@/stores/attendance-store";
import {
  getWorkEmployeeIdFromUser,
  useSessionStore,
} from "@/stores/session-store";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import type { AttendanceRecord } from "@/types";

export default function AttendancePage() {
  const { t } = useTranslation();
  const workEmployeeId = useSessionStore((s) =>
    getWorkEmployeeIdFromUser(s.user)
  );
  const role = useSessionStore((s) => s.role);
  const isAdmin = role === "admin";
  const fetchTodayRecord = useAttendanceStore((s) => s.fetchTodayRecord);
  const todayRecord = useAttendanceStore((s) => s.todayRecord);
  const isLoadingToday = useAttendanceStore((s) => s.isLoading);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [mobileTab, setMobileTab] = useState("today");

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    const res = await getEmployeeAttendance(workEmployeeId);
    if (res.success) setHistory(res.data);
    setHistoryLoading(false);
  }, [workEmployeeId]);

  useEffect(() => {
    let mounted = true;
    setReady(false);
    (async () => {
      await fetchTodayRecord(workEmployeeId);
      await loadHistory();
      if (mounted) setReady(true);
    })();
    return () => {
      mounted = false;
    };
  }, [fetchTodayRecord, loadHistory, workEmployeeId]);

  useEffect(() => {
    if (!ready) return;
    void loadHistory();
  }, [
    ready,
    loadHistory,
    todayRecord?.checkIn,
    todayRecord?.checkOut,
    todayRecord?.status,
    todayRecord?.workingMinutes,
  ]);

  if (!ready && (isLoadingToday || historyLoading)) {
    return <PageSkeleton />;
  }

  const todaySection = (
    <div className="grid gap-4 sm:gap-6 xl:grid-cols-5">
      <div className="xl:col-span-3">
        <CheckInPanel />
      </div>
      <div className="xl:col-span-2">
        <AttendanceTimeline />
      </div>
    </div>
  );

  const weekSection = (
    <>
      <WeeklySummary records={history} />
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <AttendanceCalendar records={history} />
        <AttendanceHeatmap records={history} />
      </div>
    </>
  );

  const analyticsSection = <MonthlyAnalytics records={history} />;

  const historySection = (
    <AttendanceHistory records={history} loading={historyLoading && !ready} />
  );

  return (
    <PageTransition>
      <PageHeader
        className="mb-4 sm:mb-7"
        eyebrow={t("attendance.eyebrow")}
        title={
          isAdmin ? t("attendance.teamBoard") : t("attendance.myAttendance")
        }
        description={
          isAdmin
            ? t("attendance.teamBoardDesc")
            : t("attendance.description")
        }
      />

      {/* Employee mobile: sectioned tabs */}
      {!isAdmin ? (
        <div className="lg:hidden">
          <Tabs
            value={mobileTab}
            onValueChange={setMobileTab}
            className="space-y-4"
          >
            <div className="sticky top-14 z-20 -mx-4 bg-background/90 px-4 py-2 backdrop-blur-xl">
              <TabsList className="grid h-auto w-full grid-cols-4 gap-1 rounded-2xl border border-border/60 bg-card p-1 shadow-sm">
                {(
                  [
                    ["today", "attendance.mobileTabToday"],
                    ["week", "attendance.mobileTabWeek"],
                    ["analytics", "attendance.mobileTabAnalytics"],
                    ["history", "attendance.mobileTabHistory"],
                  ] as const
                ).map(([value, label]) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="rounded-xl px-1 py-2.5 text-[11px] font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
                  >
                    {t(label)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            <TabsContent value="today" className="mt-0 space-y-4">
              {todaySection}
            </TabsContent>
            <TabsContent value="week" className="mt-0 space-y-4">
              {weekSection}
            </TabsContent>
            <TabsContent value="analytics" className="mt-0 space-y-4">
              {analyticsSection}
            </TabsContent>
            <TabsContent value="history" className="mt-0 space-y-4">
              {historySection}
            </TabsContent>
          </Tabs>
        </div>
      ) : null}

      {/* Desktop / admin: full stacked layout */}
      <div
        className={cn(
          "space-y-6 sm:space-y-8",
          !isAdmin && "hidden lg:block"
        )}
      >
        {todaySection}
        {weekSection}
        {analyticsSection}
        {isAdmin ? <TeamAttendanceBoard /> : null}
        {historySection}
      </div>
    </PageTransition>
  );
}
