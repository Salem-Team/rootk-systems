import { CatalogManager } from "@/components/targets/catalog-manager";
import { DelayedCenter } from "@/components/targets/delayed-center";
import { EmployeePerformancePanel } from "@/components/targets/employee-performance-panel";
import { PerformanceReportPanel } from "@/components/targets/performance-report-panel";
import { TargetDashboardPanel } from "@/components/targets/target-dashboard-panel";
import { TargetFiltersBar } from "@/components/targets/target-filters";
import { TargetKpiCards } from "@/components/targets/target-kpi-cards";
import { TargetsDataTable } from "@/components/targets/targets-data-table";
import { WarningCenter } from "@/components/targets/warning-center";
import type { Employee } from "@/types";
import type {
  PerformanceTarget,
  TargetCategory,
  TargetDashboardStats,
  TargetFilters,
} from "@/types/targets";
import type { TargetHubTab } from "@/components/targets/target-hub-sidebar";

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
  isAdmin,
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
  isAdmin: boolean;
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
        isAdmin ? (
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
            employees={employeeMap}
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
          onEdit={isAdmin ? onEdit : undefined}
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
          onEdit={isAdmin ? onEdit : undefined}
        />
      ) : null}
    </>
  );
}
