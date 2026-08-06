"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { format } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { PageTransition } from "@/components/shared/page-transition";
import { PageSkeleton } from "@/components/shared/loading-state";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  DEFAULT_FILTERS,
  ReportFilters,
  type ReportFilterValues,
} from "@/components/reports/report-filters";
import { ReportStats } from "@/components/reports/report-stats";
import { ExecutiveKpiRow } from "@/components/reports/executive-kpi-row";
import { AnalyticsSectionNav } from "@/components/reports/analytics-section-nav";
import { AnalyticsChartsStudio } from "@/components/reports/analytics-charts-studio";
import { DepartmentAnalyticsPanel } from "@/components/reports/department-analytics-panel";
import { AnalyticsHeatmaps } from "@/components/reports/analytics-heatmaps";
import {
  ExecutiveInsightsPanel,
  ExportCenterPanel,
} from "@/components/reports/insights-export-panels";
import {
  LeaveAnalyticsPanel,
  PerformanceOverviewPanel,
} from "@/components/reports/leave-performance-panels";
import type { AnalyticsSection } from "@/components/reports/analytics-mock-data";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { getAttendance } from "@/services/attendance.service";
import {
  getDashboardStats,
  getMonthlyStats,
  getWeeklyStats,
} from "@/services/dashboard.service";
import { getEmployees } from "@/services/employees.service";
import { RoleGate } from "@/components/shared/role-gate";
import { useTranslation } from "@/hooks/use-translation";
import { departmentLabel } from "@/lib/department-label";
import type { TranslationPath } from "@/i18n";
import { fadeInUp } from "@/lib/animations";
import { downloadCsv, formatHours } from "@/lib/utils";
import { formatHmDuration } from "@/lib/duration-format";
import { LateDurationBadge } from "@/components/shared/late-duration-badge";
import type {
  AttendanceRecord,
  DashboardStats,
  Employee,
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

export default function ReportsPage() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<AnalyticsSection>("overview");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [weekly, setWeekly] = useState<WeeklyStat[]>([]);
  const [monthly, setMonthly] = useState<MonthlyStat[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filters, setFilters] = useState<ReportFilterValues>(DEFAULT_FILTERS);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [statsRes, weeklyRes, monthlyRes, attendanceRes, employeesRes] =
        await Promise.all([
          getDashboardStats(),
          getWeeklyStats(),
          getMonthlyStats(),
          getAttendance(),
          getEmployees(),
        ]);
      if (!mounted) return;
      if (statsRes.success) setStats(statsRes.data);
      if (weeklyRes.success) setWeekly(weeklyRes.data);
      if (monthlyRes.success) setMonthly(monthlyRes.data);
      if (attendanceRes.success) setAttendance(attendanceRes.data);
      if (employeesRes.success) setEmployees(employeesRes.data);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const employeeMap = useMemo(
    () => new Map(employees.map((e) => [e.id, e])),
    [employees]
  );

  const filteredAttendance = useMemo(() => {
    return attendance.filter((record) => {
      const employee = employeeMap.get(record.employeeId);
      if (!employee || employee.deletedAt) return false;
      if (
        filters.department !== "all" &&
        employee.department !== filters.department
      ) {
        return false;
      }
      if (filters.status !== "all" && record.status !== filters.status) {
        return false;
      }
      if (filters.employee !== "all" && record.employeeId !== filters.employee) {
        return false;
      }
      if (
        filters.location !== "all" &&
        !employee.location.toLowerCase().includes(filters.location.toLowerCase())
      ) {
        return false;
      }
      if (filters.workMode === "remote" && record.status !== "wfh") {
        return false;
      }
      if (
        filters.workMode === "office" &&
        (record.status === "wfh" || record.status === "on_leave")
      ) {
        return false;
      }
      if (filters.workMode === "hybrid" && record.status !== "half_day") {
        return false;
      }
      if (filters.shift !== "all" && filters.shift !== "flexible") {
        const hour = record.checkIn
          ? Number(record.checkIn.match(/T(\d{2})/)?.[1] ?? Number.NaN)
          : Number.NaN;
        if (Number.isNaN(hour)) return false;
        if (filters.shift === "morning" && hour >= 14) return false;
        if (filters.shift === "evening" && hour < 14) return false;
      }
      if (filters.leaveType !== "all") {
        if (record.status !== "on_leave") return false;
        const note = (record.note ?? "").toLowerCase();
        if (!note.includes(filters.leaveType.toLowerCase())) return false;
      }
      if (filters.range?.from) {
        const from = format(filters.range.from, "yyyy-MM-dd");
        if (record.date < from) return false;
      }
      if (filters.range?.to) {
        const to = format(filters.range.to, "yyyy-MM-dd");
        if (record.date > to) return false;
      }
      return true;
    });
  }, [attendance, employeeMap, filters]);

  if (loading || !stats) {
    return (
      <RoleGate allow={["admin"]}>
        <PageSkeleton />
      </RoleGate>
    );
  }

  return (
    <RoleGate allow={["admin"]}>
      <PageTransition>
        <PageHeader
          title={t("reports.title")}
          description={t("reports.description")}
        />

        <div className="space-y-6">
          <ReportFilters
            value={filters}
            onChange={setFilters}
            employees={employees.map((e) => ({ id: e.id, name: e.name }))}
          />

          <ExecutiveKpiRow />

          <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
            <aside className="lg:sticky lg:top-20 lg:self-start">
              <div className="surface-panel p-2">
                <AnalyticsSectionNav active={section} onChange={setSection} />
              </div>
            </aside>

            <div className="min-w-0 space-y-6">
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
                      <ReportStats
                        stats={stats}
                        weekly={weekly}
                        monthly={monthly}
                      />
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

                  {section === "performance" && <PerformanceOverviewPanel />}

                  {section === "leave" && <LeaveAnalyticsPanel />}

                  {section === "hours" && (
                    <>
                      <SectionIntro
                        title={t("analytics.navHours")}
                        description={t("analytics.sectionHoursDesc")}
                      />
                      <AnalyticsChartsStudio focus="hours" />
                      <ReportCharts
                        weekly={weekly}
                        monthly={monthly}
                        variant="hours"
                      />
                      <AttendanceTable
                        records={filteredAttendance.filter(
                          (r) => r.workingMinutes > 0
                        )}
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
                      <ReportCharts
                        weekly={weekly}
                        monthly={monthly}
                        variant="late"
                      />
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
                      <ReportCharts
                        weekly={weekly}
                        monthly={monthly}
                        variant="absence"
                      />
                      <AttendanceTable
                        records={filteredAttendance.filter(
                          (r) => r.status === "absent"
                        )}
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
                        records={filteredAttendance.filter(
                          (r) => r.status === "wfh"
                        )}
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
                      <ReportCharts
                        weekly={weekly}
                        monthly={monthly}
                        variant="monthly"
                      />
                      <Card className="surface-panel overflow-hidden border-0 shadow-none">
                        <CardHeader>
                          <CardTitle>{t("reports.monthlyTab")}</CardTitle>
                          <CardDescription>
                            {t("dashboard.monthlyDesc")}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <DataTable className="min-w-[32rem] sm:min-w-[560px]">
                            <DataTableHeader>
                              <DataTableHeaderRow>
                                <DataTableHead>
                                  {t("reports.monthlyTab")}
                                </DataTableHead>
                                <DataTableHead>
                                  {t("reports.statsRate")}
                                </DataTableHead>
                                <DataTableHead>
                                  {t("reports.statsLate")}
                                </DataTableHead>
                                <DataTableHead>
                                  {t("reports.statsAbsent")}
                                </DataTableHead>
                                <DataTableHead>
                                  {t("reports.statsHours")}
                                </DataTableHead>
                              </DataTableHeaderRow>
                            </DataTableHeader>
                            <DataTableBody>
                              {monthly.map((row) => (
                                <DataTableRow key={row.month}>
                                  <DataTableCell className="font-medium">
                                    {t(
                                      `months.${row.month}` as TranslationPath
                                    )}
                                  </DataTableCell>
                                  <DataTableCell>
                                    {row.attendanceRate}%
                                  </DataTableCell>
                                  <DataTableCell>{row.lateCount}</DataTableCell>
                                  <DataTableCell>
                                    {row.absentCount}
                                  </DataTableCell>
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
            </div>
          </div>
        </div>
      </PageTransition>
    </RoleGate>
  );
}

function SectionIntro({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function AttendanceTable({
  records,
  employees,
  showHours = false,
  emptyTitle,
  emptyDescription,
}: {
  records: AttendanceRecord[];
  employees: Map<string, Employee>;
  showHours?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const { t, locale } = useTranslation();
  const dateLocale = locale === "ar" ? arLocale : enUS;
  const title = emptyTitle ?? t("reports.emptyTitle");
  const description = emptyDescription ?? t("reports.emptyDesc");

  function handleExport() {
    const header = [
      t("common.name"),
      t("common.department"),
      t("common.date"),
      t("common.status"),
      t("attendance.checkIn"),
      showHours ? t("common.hours") : t("status.late"),
    ];
    const rows = records.map((record) => {
      const employee = employees.get(record.employeeId);
      return [
        employee?.name ?? record.employeeId,
        employee?.department
          ? departmentLabel(employee.department, t)
          : "",
        record.date,
        t(`status.${record.status}`),
        record.checkIn
          ? format(new Date(record.checkIn), "h:mm a", { locale: dateLocale })
          : "",
        showHours
          ? formatHours(record.workingMinutes)
          : record.lateMinutes > 0
            ? formatHmDuration(record.lateMinutes, t)
            : "",
      ];
    });
    downloadCsv(`rootk-attendance-${format(new Date(), "yyyy-MM-dd")}.csv`, [
      header,
      ...rows,
    ]);
    toast.success(t("reports.exported"));
  }

  if (records.length === 0) {
    return (
      <Card className="surface-panel border-0 shadow-none">
        <CardContent className="pt-6">
          <EmptyState compact title={title} description={description} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="surface-panel overflow-hidden border-0 shadow-none">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>{t("reports.detailTitle")}</CardTitle>
          <CardDescription>
            {records.length} · {t("reports.detailDesc")}
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download />
          {t("common.exportCsv")}
        </Button>
      </CardHeader>
      <CardContent>
        <DataTable className="min-w-[36rem] sm:min-w-[640px]">
          <DataTableHeader>
            <DataTableHeaderRow>
              <DataTableHead>{t("common.name")}</DataTableHead>
              <DataTableHead>{t("common.department")}</DataTableHead>
              <DataTableHead>{t("common.date")}</DataTableHead>
              <DataTableHead>{t("common.status")}</DataTableHead>
              <DataTableHead>{t("attendance.checkIn")}</DataTableHead>
              <DataTableHead>
                {showHours ? t("common.hours") : t("status.late")}
              </DataTableHead>
            </DataTableHeaderRow>
          </DataTableHeader>
          <DataTableBody>
            {records.slice(0, 40).map((record) => {
              const employee = employees.get(record.employeeId);
              return (
                <DataTableRow key={record.id}>
                  <DataTableCell className="font-medium">
                    {employee?.name ?? record.employeeId}
                  </DataTableCell>
                  <DataTableCell className="text-muted-foreground">
                    {employee?.department
                      ? departmentLabel(employee.department, t)
                      : "—"}
                  </DataTableCell>
                  <DataTableCell>{record.date}</DataTableCell>
                  <DataTableCell>
                    <StatusBadge status={record.status} />
                  </DataTableCell>
                  <DataTableCell className="text-muted-foreground">
                    {record.checkIn
                      ? format(new Date(record.checkIn), "h:mm a", {
                          locale: dateLocale,
                        })
                      : "—"}
                  </DataTableCell>
                  <DataTableCell>
                    {showHours
                      ? formatHours(record.workingMinutes)
                      : record.lateMinutes > 0
                        ? (
                            <LateDurationBadge
                              minutes={record.lateMinutes}
                              size="sm"
                              durationOnly
                            />
                          )
                        : "—"}
                  </DataTableCell>
                </DataTableRow>
              );
            })}
          </DataTableBody>
        </DataTable>
      </CardContent>
    </Card>
  );
}
