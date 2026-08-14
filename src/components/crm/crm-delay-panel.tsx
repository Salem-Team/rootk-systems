"use client";

import { TimerReset } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-state";
import { CrmLeadsPanel } from "@/components/crm/crm-leads-panel";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types";
import type { CrmLead, CrmLeadFilters, CrmStage, PaginatedLeads } from "@/types/crm";

interface CrmDelayPanelProps {
  leads: PaginatedLeads | null;
  stages: CrmStage[];
  employees: Employee[];
  filters: CrmLeadFilters;
  onFiltersChange: (filters: CrmLeadFilters) => void;
  loading?: boolean;
  onRowClick: (lead: CrmLead) => void;
  canAssign?: boolean;
  className?: string;
}

/**
 * Delay face — active leads whose next-action datetime has already passed.
 */
export function CrmDelayPanel({
  leads,
  stages,
  employees,
  filters,
  onFiltersChange,
  loading = false,
  onRowClick,
  canAssign = false,
  className,
}: CrmDelayPanelProps) {
  const { t } = useTranslation();
  const count = leads?.total ?? 0;

  return (
    <div className={cn("space-y-4", className)}>
      <section className="surface-panel overflow-hidden">
        <div className="flex flex-wrap items-start gap-3 border-b border-border/60 px-4 py-3.5 sm:px-5">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300">
            <TimerReset className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold tracking-tight">
              {t("crm.delay.title")}
            </h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              {t("crm.delay.description")}
            </p>
          </div>
          <p className="font-mono text-sm tabular-nums text-muted-foreground">
            {t("crm.delay.count", { count: String(count) })}
          </p>
        </div>
      </section>

      {loading && !leads ? (
        <TableSkeleton rows={5} />
      ) : !loading && count === 0 ? (
        <EmptyState
          title={t("crm.delay.empty")}
          description={t("crm.delay.emptyDesc")}
        />
      ) : (
        <CrmLeadsPanel
          leads={leads}
          stages={stages}
          employees={employees}
          filters={filters}
          onFiltersChange={onFiltersChange}
          loading={loading}
          onRowClick={onRowClick}
          canAssign={canAssign}
          canImport={false}
        />
      )}
    </div>
  );
}
