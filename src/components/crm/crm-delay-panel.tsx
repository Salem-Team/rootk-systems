"use client";

import type { Dispatch, SetStateAction } from "react";
import { TimerReset } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-state";
import { CrmLeadsPanel } from "@/components/crm/crm-leads-panel";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types";
import type { CrmFeedbackType, CrmLead, CrmLeadFilters, CrmStage, PaginatedLeads } from "@/types/crm";

const DELAY_FILTER_EXCLUDE: Array<keyof CrmLeadFilters> = ["status", "followUp"];
const DELAY_LOCKED_FILTERS: Array<"status" | "followUp"> = ["status", "followUp"];

interface CrmDelayPanelProps {
  leads: PaginatedLeads | null;
  stages: CrmStage[];
  employees: Employee[];
  filters: CrmLeadFilters;
  onFiltersChange: Dispatch<SetStateAction<CrmLeadFilters>>;
  loading?: boolean;
  syncing?: boolean;
  onRowClick: (lead: CrmLead) => void;
  onViewHistory?: (lead: CrmLead) => void;
  canAssign?: boolean;
  canViewOthers?: boolean;
  canViewTeam?: boolean;
  feedbackTypes?: CrmFeedbackType[];
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
  syncing = false,
  onRowClick,
  onViewHistory,
  canAssign = false,
  canViewOthers = false,
  canViewTeam = false,
  feedbackTypes = [],
  className,
}: CrmDelayPanelProps) {
  const { t } = useTranslation();
  const count = leads?.total ?? 0;
  const hasData = leads != null;
  // null page = switching tabs / first fetch — never flash another tab's rows
  const showInitialSkeleton = !hasData || (hasData && count === 0 && (loading || syncing));
  const showEmpty = hasData && count === 0 && !loading && !syncing;
  const showTable = hasData && count > 0;

  return (
    <div className={cn("space-y-4", className)}>
      <section className="surface-panel overflow-hidden">
        <div className="flex items-start gap-3 px-3.5 py-3 sm:px-5 sm:py-3.5">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300">
            <TimerReset className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold tracking-tight">
                {t("crm.delay.title")}
              </h2>
              <p className="shrink-0 font-mono text-sm tabular-nums text-muted-foreground">
                {t("crm.delay.count", { count: String(count) })}
              </p>
            </div>
            <p className="mt-0.5 line-clamp-2 text-[12px] text-muted-foreground sm:text-[13px]">
              {t("crm.delay.description")}
            </p>
          </div>
        </div>
      </section>

      {showInitialSkeleton ? (
        <TableSkeleton rows={5} />
      ) : showEmpty ? (
        <EmptyState
          title={t("crm.delay.empty")}
          description={t("crm.delay.emptyDesc")}
        />
      ) : showTable && leads ? (
        <CrmLeadsPanel
          leads={leads}
          stages={stages}
          employees={employees}
          filters={filters}
          onFiltersChange={onFiltersChange}
          loading={loading}
          onRowClick={onRowClick}
          onViewHistory={onViewHistory}
          canAssign={canAssign}
          canViewOthers={canViewOthers}
          canViewTeam={canViewTeam}
          canImport={false}
          filterBadgeExclude={DELAY_FILTER_EXCLUDE}
          lockedFilterKeys={DELAY_LOCKED_FILTERS}
          feedbackTypes={feedbackTypes}
          hideTitle
        />
      ) : (
        <TableSkeleton rows={5} />
      )}
    </div>
  );
}
