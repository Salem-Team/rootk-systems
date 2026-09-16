"use client";

import dynamic from "next/dynamic";
import { TargetFiltersBar } from "@/components/targets/target-filters";
import { TargetKpiCards } from "@/components/targets/target-kpi-cards";
import { Skeleton } from "@/components/ui/skeleton";
import type { Employee } from "@/types";
import type {
  PerformanceTarget,
  TargetCategory,
  TargetDashboardStats,
  TargetFilters,
} from "@/types/targets";
import type { TargetHubTab } from "@/components/targets/target-hub-sidebar";

const panelLoading = () => <Skeleton className="h-72 w-full rounded-xl" />;

const TargetDashboardPanel = dynamic(
  () =>
    import("@/components/targets/target-dashboard-panel").then(
      (m) => m.TargetDashboardPanel
    ),
  { ssr: false, loading: panelLoading }
);
const TargetsDataTable = dynamic(
  () =>
    import("@/components/targets/targets-data-table").then(
      (m) => m.TargetsDataTable
    ),
  { loading: panelLoading }
);
const EmployeePerformancePanel = dynamic(
  () =>
    import("@/components/targets/employee-performance-panel").then(
      (m) => m.EmployeePerformancePanel
    ),
  { loading: panelLoading }
);
const PerformanceReportPanel = dynamic(
  () =>
    import("@/components/targets/performance-report-panel").then(
      (m) => m.PerformanceReportPanel
    ),
  { loading: panelLoading }
);
const CatalogManager = dynamic(
  () =>
    import("@/components/targets/catalog-manager").then((m) => m.CatalogManager),
  { loading: panelLoading }
);
const WarningCenter = dynamic(
  () =>
    import("@/components/targets/warning-center").then((m) => m.WarningCenter),
  { loading: panelLoading }
);
const DelayedCenter = dynamic(
  () =>
    import("@/components/targets/delayed-center").then((m) => m.DelayedCenter),
  { loading: panelLoading }
);

export function TargetsTabContent({
  tab,
  stats,
  employeeMap,
  categoryMap,
  employees,
  targets,
  targetsLoading,
  filters,
  setFilters,
  assigneeCounts,
  canManageCompanyTargets,
  canAssign,
  canViewReports,
  canManageCatalog,
  workEmployeeId,
  onCategoryFromChart,
  onView,
  onEdit,
  onDelete,
  onCreate,
}: {
  tab: TargetHubTab;
  stats: TargetDashboardStats | null;
  employeeMap: Map<string, Employee>;
  categoryMap: Map<string, TargetCategory>;
  employees: Employee[];
  targets: PerformanceTarget[];
  targetsLoading: boolean;
  filters: TargetFilters;
  setFilters: (updater: TargetFilters | ((prev: TargetFilters) => TargetFilters)) => void;
  assigneeCounts: Map<string, number>;
  canManageCompanyTargets: boolean;
  canAssign: boolean;
  canViewReports: boolean;
  canManageCatalog: boolean;
  workEmployeeId: string;
  onCategoryFromChart: (categoryId: string) => void;
  onView: (target: PerformanceTarget) => void;
  onEdit: (target: PerformanceTarget) => void;
  onDelete: (target: PerformanceTarget) => void;
  onCreate: () => void;
}) {
  return (
    <>
      {tab === "dashboard" && stats ? (
        <>
          <TargetKpiCards stats={stats} />
          <TargetDashboardPanel
            stats={stats}
            employees={employeeMap}
            onCategorySelect={onCategoryFromChart}
          />
        </>
      ) : null}

      {tab === "targets" ? (
        canManageCompanyTargets ? (
          <>
            <TargetFiltersBar
              value={filters}
              onChange={setFilters}
              employees={employees}
              assigneeCounts={assigneeCounts}
            />
            <TargetsDataTable
              targets={targets}
              categories={categoryMap}
              employees={employeeMap}
              loading={targetsLoading}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
              onCreate={canAssign ? onCreate : undefined}
            />
          </>
        ) : (
          <EmployeePerformancePanel
            employeeId={workEmployeeId}
            categories={categoryMap}
            categoryId={filters.categoryId}
            onView={onView}
          />
        )
      ) : null}

      {tab === "performance" && canViewReports ? (
        <PerformanceReportPanel
          targets={targets}
          categories={categoryMap}
          employees={employeeMap}
          categoryId={filters.categoryId}
          onView={onView}
          onEdit={canManageCompanyTargets ? onEdit : undefined}
        />
      ) : null}

      {tab === "catalog" && canManageCatalog ? <CatalogManager /> : null}

      {tab === "warnings" ? (
        <WarningCenter targets={targets} employees={employeeMap} />
      ) : null}

      {tab === "delayed" ? (
        <DelayedCenter
          categories={categoryMap}
          employees={employeeMap}
          categoryId={filters.categoryId}
          onView={onView}
          onEdit={canManageCompanyTargets ? onEdit : undefined}
        />
      ) : null}
    </>
  );
}
