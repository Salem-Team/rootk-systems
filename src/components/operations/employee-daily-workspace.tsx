"use client";

import { useState } from "react";
import { Announcements } from "@/components/dashboard/announcements";
import {
  BirthdaysPanel,
  HolidaysPanel,
} from "@/components/dashboard/holidays-birthdays";
import { CheckInPanel } from "@/components/attendance/check-in-panel";
import {
  DailyChecklistWidget,
  GoalsWidget,
  MeetingsWidget,
  TaskBoardWidget,
} from "@/components/operations/employee-ops-panels";
import {
  ActivityCenterWidget,
  NotificationCenterWidget,
  RecentDocumentsWidget,
} from "@/components/operations/feed-ops-panels";
import { FloatingQuickActions } from "@/components/operations/floating-quick-actions";
import { CompanyCalendarMini } from "@/components/dashboard/company-calendar-mini";
import {
  buildCompanyCalendarEvents,
  buildBirthdays,
} from "@/components/dashboard/dashboard-mock-data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import type {
  Announcement,
  AttendanceRecord,
  Employee,
  Holiday,
  LeaveRequest,
} from "@/types";

export function EmployeeDailyWorkspace({
  announcements,
  holidays,
  leaves,
  employees,
}: {
  todayRecord?: AttendanceRecord | null;
  announcements: Announcement[];
  holidays: Holiday[];
  leaves: LeaveRequest[];
  employees: Employee[];
}) {
  const { t } = useTranslation();
  const [mobileTab, setMobileTab] = useState("today");
  const birthdays = buildBirthdays(employees);
  const events = buildCompanyCalendarEvents({
    holidays,
    leaves,
    birthdays,
  });

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="hidden sm:block">
        <h2 className="text-base font-semibold tracking-tight">
          {t("ops.dailyTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("ops.dailyDesc")}</p>
      </div>

      {/* Mobile: check-in first (uninterrupted), then scrolling tabs */}
      <div className="space-y-4 lg:hidden">
        <CheckInPanel />

        <Tabs value={mobileTab} onValueChange={setMobileTab} className="space-y-4">
          <TabsList className="static relative z-0 grid h-auto w-full grid-cols-3 gap-1 rounded-xl border border-border/60 bg-card p-1 shadow-sm sm:rounded-2xl">
            {(
              [
                ["today", "ops.mobileTabToday"],
                ["work", "ops.mobileTabWork"],
                ["pulse", "ops.mobileTabPulse"],
              ] as const
            ).map(([value, label]) => (
              <TabsTrigger
                key={value}
                value={value}
                className={cn(
                  "min-h-10 rounded-lg px-1 text-[11px] font-semibold transition-all sm:min-h-11 sm:rounded-xl sm:text-[12px]",
                  "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
                )}
              >
                {t(label)}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="today" className="mt-0 space-y-3">
            <DailyChecklistWidget />
          </TabsContent>
          <TabsContent value="work" className="mt-0 space-y-3">
            <TaskBoardWidget />
            <MeetingsWidget />
            <GoalsWidget />
          </TabsContent>
          <TabsContent value="pulse" className="mt-0 space-y-3">
            <NotificationCenterWidget />
            <Announcements
              items={announcements}
              title={t("employeeHome.companyNews")}
              description={t("employeeHome.companyNewsDesc")}
            />
            <CompanyCalendarMini events={events} />
            <div className="grid gap-3 sm:grid-cols-2">
              <BirthdaysPanel items={birthdays} />
              <HolidaysPanel holidays={holidays} />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="hidden gap-4 lg:grid xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-8">
          <CheckInPanel />
          <TaskBoardWidget />
          <MeetingsWidget />
          <ActivityCenterWidget />
        </div>

        <div className="space-y-4 xl:col-span-4">
          <DailyChecklistWidget />
          <GoalsWidget />
          <NotificationCenterWidget />
          <Announcements
            items={announcements}
            title={t("employeeHome.companyNews")}
            description={t("employeeHome.companyNewsDesc")}
          />
          <RecentDocumentsWidget />
          <CompanyCalendarMini events={events} />
          <BirthdaysPanel items={birthdays} />
          <HolidaysPanel holidays={holidays} />
        </div>
      </div>

      <FloatingQuickActions variant="employee" />
    </div>
  );
}
