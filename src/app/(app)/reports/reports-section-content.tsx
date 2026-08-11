"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AnalyticsChartsStudio } from "@/components/reports/analytics-charts-studio";
import { DepartmentAnalyticsPanel } from "@/components/reports/department-analytics-panel";
import { AnalyticsHeatmaps } from "@/components/reports/analytics-heatmaps";
import {
  ExecutiveInsightsPanel,
  ExportCenterPanel,
} from "@/components/reports/insights-export-panels";
import { EmployeeActivityTable } from "@/components/reports/employee-activity-table";
import {
  LeaveAnalyticsPanel,
  PerformanceOverviewPanel,
} from "@/components/reports/leave-performance-panels";
import { ReportStats } from "@/components/reports/report-stats";
import type { AnalyticsSection } from "@/components/reports/analytics-mock-data";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableHeaderRow,
  DataTableRow,
} from "@/components/ui/data-table";
import { useTranslation } from "@/hooks/use-translation";
import type { TranslationPath } from "@/i18n";
import { fadeInUp } from "@/lib/animations";
import {
  AttendanceTable,
  SectionIntro,
} from "@/app/(app)/reports/reports-attendance-table";
import type {
  AttendanceRecord,
  DashboardStats,
  Employee,
  DailyReportRow,
  MonthlyStat,
  WeeklyStat,
} from "@/types";

const ReportCharts = dynamic(
  () =>
    import("@/components/reports/report-charts").then((m) => m.ReportCharts),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[400px] rounded-xl" />,
  }
);

export function ReportsSectionContent({
  section,
  stats,
  weekly,
  monthly,
  filteredAttendance,
  employeeMap,
  filteredActivity,
}: {
  section: AnalyticsSection;
  stats: DashboardStats;
  weekly: WeeklyStat[];
  monthly: MonthlyStat[];
  filteredAttendance: AttendanceRecord[];
  employeeMap: Map<string, Employee>;
  filteredActivity: DailyReportRow[];
}) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={section}
        variants={fadeInUp}
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
        exit={reduceMotion ? undefined : "hidden"}
        className="space-y-6"
      >
        {section === "overview" && (
          <>
            <ReportStats stats={stats} weekly={weekly} monthly={monthly} />
            <SectionIntro
              title={t("analytics.performanceTitle")}
              description={t("analytics.performanceDesc")}
            />
            <EmployeeActivityTable rows={filteredActivity} compact />
            <AnalyticsChartsStudio focus="all" />
            <ExecutiveInsightsPanel />
            <AnalyticsHeatmaps />
            <ExportCenterPanel />
          </>
        )}

        {section === "attendance" && (
          <>
            <SectionIntro
              title={t("analytics.navAttendance")}
              description={t("analytics.sectionAttendanceDesc")}
            />
            <AnalyticsChartsStudio focus="attendance" />
            <ReportCharts
              weekly={weekly}
              monthly={monthly}
              variant="attendance"
            />
            <AttendanceTable
              records={filteredAttendance}
              employees={employeeMap}
            />
          </>
        )}

        {section === "departments" && (
          <>
            <SectionIntro
              title={t("analytics.navDepartments")}
              description={t("analytics.sectionDepartmentsDesc")}
            />
            <DepartmentAnalyticsPanel />
            <AnalyticsHeatmaps />
          </>
        )}

        {section === "performance" && (
          <PerformanceOverviewPanel rows={filteredActivity} />
        )}

        {section === "leave" && <LeaveAnalyticsPanel />}

        {section === "hours" && (
          <>
            <SectionIntro
              title={t("analytics.navHours")}
              description={t("analytics.sectionHoursDesc")}
            />
            <AnalyticsChartsStudio focus="hours" />
            <ReportCharts weekly={weekly} monthly={monthly} variant="hours" />
            <AttendanceTable
              records={filteredAttendance.filter((r) => r.workingMinutes > 0)}
              employees={employeeMap}
              showHours
              emptyTitle={t("common.noResults")}
              emptyDescription={t("employees.emptyDesc")}
            />
          </>
        )}

        {section === "late" && (
          <>
            <SectionIntro
              title={t("analytics.navLate")}
              description={t("analytics.sectionLateDesc")}
            />
            <AnalyticsChartsStudio focus="late" />
            <ReportCharts weekly={weekly} monthly={monthly} variant="late" />
            <AttendanceTable
              records={filteredAttendance.filter(
                (r) => r.isLate || r.status === "late"
              )}
              employees={employeeMap}
              emptyTitle={t("common.noResults")}
              emptyDescription={t("employees.emptyDesc")}
            />
          </>
        )}

        {section === "absence" && (
          <>
            <SectionIntro
              title={t("analytics.navAbsence")}
              description={t("analytics.sectionAbsenceDesc")}
            />
            <AnalyticsChartsStudio focus="attendance" />
            <ReportCharts weekly={weekly} monthly={monthly} variant="absence" />
            <AttendanceTable
              records={filteredAttendance.filter((r) => r.status === "absent")}
              employees={employeeMap}
              emptyTitle={t("common.noResults")}
              emptyDescription={t("employees.emptyDesc")}
            />
          </>
        )}

        {section === "wfh" && (
          <>
            <SectionIntro
              title={t("analytics.navWfh")}
              description={t("analytics.sectionWfhDesc")}
            />
            <AnalyticsChartsStudio focus="wfh" />
            <AttendanceTable
              records={filteredAttendance.filter((r) => r.status === "wfh")}
              employees={employeeMap}
              emptyTitle={t("common.noResults")}
              emptyDescription={t("employees.emptyDesc")}
            />
          </>
        )}

        {section === "trends" && (
          <>
            <SectionIntro
              title={t("analytics.navTrends")}
              description={t("analytics.sectionTrendsDesc")}
            />
            <AnalyticsChartsStudio focus="all" />
            <ReportCharts weekly={weekly} monthly={monthly} variant="monthly" />
            <Card className="surface-panel overflow-hidden border-0 shadow-none">
              <CardHeader>
                <CardTitle>{t("reports.monthlyTab")}</CardTitle>
                <CardDescription>{t("dashboard.monthlyDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable className="min-w-[32rem] sm:min-w-[560px]">
                  <DataTableHeader>
                    <DataTableHeaderRow>
                      <DataTableHead>{t("reports.monthlyTab")}</DataTableHead>
                      <DataTableHead>{t("reports.statsRate")}</DataTableHead>
                      <DataTableHead>{t("reports.statsLate")}</DataTableHead>
                      <DataTableHead>{t("reports.statsAbsent")}</DataTableHead>
                      <DataTableHead>{t("reports.statsHours")}</DataTableHead>
                    </DataTableHeaderRow>
                  </DataTableHeader>
                  <DataTableBody>
                    {monthly.map((row) => (
                      <DataTableRow key={row.month}>
                        <DataTableCell className="font-medium">
                          {t(`months.${row.month}` as TranslationPath)}
                        </DataTableCell>
                        <DataTableCell>{row.attendanceRate}%</DataTableCell>
                        <DataTableCell>{row.lateCount}</DataTableCell>
                        <DataTableCell>{row.absentCount}</DataTableCell>
                        <DataTableCell>
                          {row.avgHours.toFixed(1)}h
                        </DataTableCell>
                      </DataTableRow>
                    ))}
                  </DataTableBody>
                </DataTable>
              </CardContent>
            </Card>
            <AnalyticsHeatmaps />
            <ExecutiveInsightsPanel />
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
