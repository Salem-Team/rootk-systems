"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ReportStats } from "@/components/reports/report-stats";
import type { AnalyticsSection } from "@/components/reports/analytics-mock-data";
import type { AnalyticsBundle } from "@/lib/reports/compute-analytics";
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
import type { AttendanceRecord, Employee, DailyReportRow } from "@/types";

const sectionLoading = () => <Skeleton className="h-64 w-full rounded-xl" />;

const ReportCharts = dynamic(
  () =>
    import("@/components/reports/report-charts").then((m) => m.ReportCharts),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[400px] rounded-xl" />,
  }
);
const AnalyticsChartsStudio = dynamic(
  () =>
    import("@/components/reports/analytics-charts-studio").then(
      (m) => m.AnalyticsChartsStudio
    ),
  { ssr: false, loading: sectionLoading }
);
const DepartmentAnalyticsPanel = dynamic(
  () =>
    import("@/components/reports/department-analytics-panel").then(
      (m) => m.DepartmentAnalyticsPanel
    ),
  { loading: sectionLoading }
);
const AnalyticsHeatmaps = dynamic(
  () =>
    import("@/components/reports/analytics-heatmaps").then(
      (m) => m.AnalyticsHeatmaps
    ),
  { ssr: false, loading: sectionLoading }
);
const ExecutiveInsightsPanel = dynamic(
  () =>
    import("@/components/reports/insights-export-panels").then(
      (m) => m.ExecutiveInsightsPanel
    ),
  { loading: sectionLoading }
);
const ExportCenterPanel = dynamic(
  () =>
    import("@/components/reports/insights-export-panels").then(
      (m) => m.ExportCenterPanel
    ),
  { loading: sectionLoading }
);
const EmployeeActivityTable = dynamic(
  () =>
    import("@/components/reports/employee-activity-table").then(
      (m) => m.EmployeeActivityTable
    ),
  { loading: sectionLoading }
);
const LeaveAnalyticsPanel = dynamic(
  () =>
    import("@/components/reports/leave-performance-panels").then(
      (m) => m.LeaveAnalyticsPanel
    ),
  { loading: sectionLoading }
);
const PerformanceOverviewPanel = dynamic(
  () =>
    import("@/components/reports/leave-performance-panels").then(
      (m) => m.PerformanceOverviewPanel
    ),
  { loading: sectionLoading }
);

const MONTH_KEYS: Record<string, TranslationPath> = {
  Jan: "months.Jan",
  Feb: "months.Feb",
  Mar: "months.Mar",
  Apr: "months.Apr",
  May: "months.May",
  Jun: "months.Jun",
  Jul: "months.Jul",
  Aug: "months.Aug",
  Sep: "months.Sep",
  Oct: "months.Oct",
  Nov: "months.Nov",
  Dec: "months.Dec",
};

function ChartsFromAnalytics({
  analytics,
  focus,
}: {
  analytics: AnalyticsBundle;
  focus: "attendance" | "hours" | "late" | "wfh" | "leave" | "all";
}) {
  return (
    <AnalyticsChartsStudio
      focus={focus}
      weeklyTrends={analytics.weeklyTrends}
      monthlyTrends={analytics.monthlyTrends}
      quarterlyTrends={analytics.quarterlyTrends}
      leaveSeries={analytics.leaveSeries}
      modePie={analytics.modePie}
      radar={analytics.radar}
    />
  );
}

export function ReportsSectionContent({
  section,
  filteredAttendance,
  employeeMap,
  filteredActivity,
  analytics,
}: {
  section: AnalyticsSection;
  filteredAttendance: AttendanceRecord[];
  employeeMap: Map<string, Employee>;
  filteredActivity: DailyReportRow[];
  analytics: AnalyticsBundle;
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
        className="min-w-0 max-w-full space-y-4 sm:space-y-6"
      >
        {section === "overview" && (
          <>
            <ReportStats summary={analytics.summary} />
            <SectionIntro
              title={t("analytics.performanceTitle")}
              description={t("analytics.performanceDesc")}
            />
            <EmployeeActivityTable rows={filteredActivity} compact />
            <ChartsFromAnalytics analytics={analytics} focus="all" />
            <ExecutiveInsightsPanel insights={analytics.insights} />
            <AnalyticsHeatmaps
              deptHeat={analytics.deptHeatmap}
              weekHeat={analytics.weekHeatmap}
            />
            <ExportCenterPanel
              attendance={filteredAttendance}
              activity={filteredActivity}
              employees={employeeMap}
            />
          </>
        )}

        {section === "attendance" && (
          <>
            <SectionIntro
              title={t("analytics.navAttendance")}
              description={t("analytics.sectionAttendanceDesc")}
            />
            <ChartsFromAnalytics analytics={analytics} focus="attendance" />
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
            <DepartmentAnalyticsPanel rows={analytics.departments} />
            <AnalyticsHeatmaps
              deptHeat={analytics.deptHeatmap}
              weekHeat={analytics.weekHeatmap}
            />
          </>
        )}

        {section === "performance" && (
          <PerformanceOverviewPanel rows={filteredActivity} />
        )}

        {section === "leave" && <LeaveAnalyticsPanel analytics={analytics} />}

        {section === "hours" && (
          <>
            <SectionIntro
              title={t("analytics.navHours")}
              description={t("analytics.sectionHoursDesc")}
            />
            <ChartsFromAnalytics analytics={analytics} focus="hours" />
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
            <ChartsFromAnalytics analytics={analytics} focus="late" />
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
            <ChartsFromAnalytics analytics={analytics} focus="attendance" />
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
            <ChartsFromAnalytics analytics={analytics} focus="wfh" />
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
            <ChartsFromAnalytics analytics={analytics} focus="all" />
            <ReportCharts monthlyTrends={analytics.monthlyTrends} />
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
                      <DataTableHead>{t("charts.wfh")}</DataTableHead>
                      <DataTableHead>{t("reports.statsHours")}</DataTableHead>
                    </DataTableHeaderRow>
                  </DataTableHeader>
                  <DataTableBody>
                    {analytics.monthlyTrends.map((row) => (
                      <DataTableRow key={row.label}>
                        <DataTableCell className="font-medium">
                          {MONTH_KEYS[row.label]
                            ? t(MONTH_KEYS[row.label])
                            : row.label}
                        </DataTableCell>
                        <DataTableCell>{row.attendance}%</DataTableCell>
                        <DataTableCell>{row.late}</DataTableCell>
                        <DataTableCell>{row.wfh}</DataTableCell>
                        <DataTableCell>{row.hours.toFixed(1)}h</DataTableCell>
                      </DataTableRow>
                    ))}
                  </DataTableBody>
                </DataTable>
              </CardContent>
            </Card>
            <AnalyticsHeatmaps
              deptHeat={analytics.deptHeatmap}
              weekHeat={analytics.weekHeatmap}
            />
            <ExecutiveInsightsPanel insights={analytics.insights} />
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
