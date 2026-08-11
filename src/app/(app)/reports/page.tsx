"use client";

import { PageHeader } from "@/components/shared/page-header";
import { PageTransition } from "@/components/shared/page-transition";
import { PageSkeleton } from "@/components/shared/loading-state";
import {
  ReportFilters,
} from "@/components/reports/report-filters";
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
    stats,
    weekly,
    monthly,
    employees,
    filters,
    setFilters,
    employeeMap,
    filteredAttendance,
    filteredActivity,
  } = useReportsData();

  if (loading || !stats) {
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
              <ReportsSectionContent
                section={section}
                stats={stats}
                weekly={weekly}
                monthly={monthly}
                filteredAttendance={filteredAttendance}
                employeeMap={employeeMap}
                filteredActivity={filteredActivity}
              />
            </div>
          </div>
        </div>
      </PageTransition>
    </PermissionGate>
  );
}
