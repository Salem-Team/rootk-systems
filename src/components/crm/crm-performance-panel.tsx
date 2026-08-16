"use client";

import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-state";
import { CrmDashboardFiltersBar } from "@/components/crm/crm-dashboard-filters";
import { CrmInteractionBreakdownPanel } from "@/components/crm/crm-interaction-breakdown-panel";
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
import { ensureSalesPerformance } from "@/lib/crm-normalize";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types";
import type {
  CrmDashboardFilters,
  CrmInteractionBreakdown,
  CrmSalesPerformanceRow,
} from "@/types/crm";

interface CrmPerformancePanelProps {
  rows: CrmSalesPerformanceRow[];
  breakdown?: CrmInteractionBreakdown | null;
  filters: CrmDashboardFilters;
  onFiltersChange: (filters: CrmDashboardFilters) => void;
  employees: Employee[];
  canAssign?: boolean;
  canViewOthers?: boolean;
  loading?: boolean;
  onSelectEmployee: (employeeId: string) => void;
  className?: string;
}

/** Sales performance table with dated call/meeting breakdown. */
export function CrmPerformancePanel({
  rows: rowsProp,
  breakdown,
  filters,
  onFiltersChange,
  employees,
  canAssign = false,
  canViewOthers = false,
  loading = false,
  onSelectEmployee,
  className,
}: CrmPerformancePanelProps) {
  const { t } = useTranslation();
  const rows = ensureSalesPerformance(rowsProp);

  if (loading) return <TableSkeleton rows={5} />;

  return (
    <div className={cn("space-y-4", className)}>
      <CrmDashboardFiltersBar
        filters={filters}
        employees={employees}
        canAssign={canAssign}
        canViewOthers={canViewOthers}
        onFiltersChange={onFiltersChange}
        showInteractionFilters
      />

      <section className="surface-panel">
        <div className="panel-header">
          <h2 className="text-sm font-semibold tracking-tight">
            {t("crm.performance.title")}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t("crm.performance.description")}
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title={t("crm.empty.performance")}
              description={t("crm.empty.performanceDesc")}
            />
          </div>
        ) : (
          <>
            <ul className="grid gap-2 p-3 md:hidden">
              {rows.map((row) => (
                <li key={row.employeeId}>
                  <button
                    type="button"
                    onClick={() => onSelectEmployee(row.employeeId)}
                    className="flex w-full flex-col gap-2 rounded-xl border border-border/70 bg-card px-3 py-3 text-start transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-[13px] font-semibold">
                        {row.employeeName}
                      </p>
                      {row.needsAttention ? (
                        <span className="shrink-0 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:text-amber-300">
                          {t("crm.performance.needsAttention")}
                        </span>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground sm:grid-cols-4">
                      <div>
                        <p>{t("crm.performance.colLeads")}</p>
                        <p className="font-mono text-[13px] font-semibold tabular-nums text-foreground">
                          {row.leads}
                        </p>
                      </div>
                      <div>
                        <p>{t("crm.performance.colActiveCalls")}</p>
                        <p className="font-mono text-[13px] font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                          {row.activeCalls}
                        </p>
                      </div>
                      <div>
                        <p>{t("crm.performance.colInactiveCalls")}</p>
                        <p className="font-mono text-[13px] font-semibold tabular-nums text-rose-700 dark:text-rose-400">
                          {row.inactiveCalls}
                        </p>
                      </div>
                      <div>
                        <p>{t("crm.performance.colRate")}</p>
                        <p className="font-mono text-[13px] font-semibold tabular-nums text-foreground">
                          {Number(row.conversionRate ?? 0).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>

            <div className="hidden md:block">
              <DataTable>
                <DataTableHeader>
                  <DataTableHeaderRow>
                    <DataTableHead>{t("crm.performance.colSales")}</DataTableHead>
                    <DataTableHead className="text-end">
                      {t("crm.performance.colLeads")}
                    </DataTableHead>
                    <DataTableHead className="text-end">
                      {t("crm.performance.colActiveCalls")}
                    </DataTableHead>
                    <DataTableHead className="text-end">
                      {t("crm.performance.colInactiveCalls")}
                    </DataTableHead>
                    <DataTableHead className="hidden text-end lg:table-cell">
                      {t("crm.interactions.meetings")}
                    </DataTableHead>
                    <DataTableHead className="hidden text-end md:table-cell">
                      {t("crm.performance.colWon")}
                    </DataTableHead>
                    <DataTableHead className="hidden text-end md:table-cell">
                      {t("crm.performance.colLost")}
                    </DataTableHead>
                    <DataTableHead className="text-end">
                      {t("crm.performance.colRate")}
                    </DataTableHead>
                  </DataTableHeaderRow>
                </DataTableHeader>
                <DataTableBody>
                  {rows.map((row) => (
                    <DataTableRow
                      key={row.employeeId}
                      className="cursor-pointer"
                      onClick={() => onSelectEmployee(row.employeeId)}
                    >
                      <DataTableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold">
                            {row.employeeName}
                          </span>
                          {row.needsAttention ? (
                            <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:text-amber-300">
                              {t("crm.performance.needsAttention")}
                            </span>
                          ) : null}
                        </div>
                      </DataTableCell>
                      <DataTableCell className="text-end font-mono tabular-nums">
                        {row.leads}
                      </DataTableCell>
                      <DataTableCell className="text-end font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                        {row.activeCalls}
                      </DataTableCell>
                      <DataTableCell className="text-end font-mono tabular-nums text-rose-700 dark:text-rose-400">
                        {row.inactiveCalls}
                      </DataTableCell>
                      <DataTableCell className="hidden text-end font-mono tabular-nums lg:table-cell">
                        {Number(row.meetings ?? 0)}
                      </DataTableCell>
                      <DataTableCell className="hidden text-end font-mono tabular-nums md:table-cell">
                        {row.won}
                      </DataTableCell>
                      <DataTableCell className="hidden text-end font-mono tabular-nums md:table-cell">
                        {row.lost}
                      </DataTableCell>
                      <DataTableCell className="text-end font-mono tabular-nums">
                        {Number(row.conversionRate ?? 0).toFixed(1)}%
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTable>
            </div>
          </>
        )}
      </section>

      <CrmInteractionBreakdownPanel breakdown={breakdown} />
    </div>
  );
}
