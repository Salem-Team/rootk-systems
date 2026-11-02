"use client";

import { PageHeader } from "@/components/shared/page-header";
import { PageTransition } from "@/components/shared/page-transition";
import { PageSkeleton } from "@/components/shared/loading-state";
import { ReportFilters } from "@/components/reports/report-filters";
import { ExecutiveKpiRow } from "@/components/reports/executive-kpi-row";
import { AnalyticsSectionNav } from "@/components/reports/analytics-section-nav";
import { PermissionGate } from "@/components/shared/permission-gate";
import { useTranslation } from "@/hooks/use-translation";
import { useReportsData } from "@/app/(app)/reports/use-reports-data";
import { ReportsSectionContent } from "@/app/(app)/reports/reports-section-content";

export default function ReportsPage() {
  const { t } = useTranslation();
  const {
    loading,
    section,
    setSection,
    employees,
    filters,
    setFilters,
    employeeMap,
    filteredAttendance,
    filteredActivity,
    analytics,
  } = useReportsData();

  if (loading || !analytics) {
    return (
      <PermissionGate anyOf={["reports.viewWeekly", "reports.viewMonthly"]}>
        <PageSkeleton />
      </PermissionGate>
    );
  }

  return (
    <PermissionGate anyOf={["reports.viewWeekly", "reports.viewMonthly"]}>
      <PageTransition>
        <PageHeader
          className="mb-3 sm:mb-7"
          eyebrow={t("nav.reports")}
          title={t("reports.title")}
          description={t("reports.description")}
        />

        <div className="min-w-0 max-w-full space-y-4 sm:space-y-6">
          <ReportFilters
            value={filters}
            onChange={setFilters}
            employees={employees.map((e) => ({ id: e.id, name: e.name }))}
          />

          <ExecutiveKpiRow kpis={analytics.executiveKpis} />

          <div className="grid min-w-0 max-w-full gap-4 sm:gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
            <aside className="min-w-0 w-full max-w-full lg:sticky lg:top-20 lg:self-start">
              <div className="sticky top-[var(--chrome-sticky-top)] z-20 min-w-0 max-w-full overflow-hidden border-b border-border/50 bg-background/94 py-2 backdrop-blur-xl lg:static lg:overflow-visible lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
                <div className="surface-panel min-w-0 max-w-full overflow-x-clip p-2 lg:overflow-visible">
                  <AnalyticsSectionNav active={section} onChange={setSection} />
                </div>
              </div>
            </aside>

            <div className="min-w-0 max-w-full space-y-4 sm:space-y-6">
              <ReportsSectionContent
                section={section}
                filteredAttendance={filteredAttendance}
                employeeMap={employeeMap}
                filteredActivity={filteredActivity}
                analytics={analytics}
              />
            </div>
          </div>
        </div>
      </PageTransition>
    </PermissionGate>
  );
}
