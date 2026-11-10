"use client";

import { LayoutList } from "lucide-react";
import { TableSkeleton } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { CrmLeadsBulkAdd } from "@/components/crm/crm-leads-bulk-add";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { canFilterCrmByOwner } from "@/lib/crm/lead-filters";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types";
import type { CrmBusinessType, CrmStage } from "@/types/crm";

export interface CrmLeadsStageCount {
  stageId: string;
  count: number;
}

interface CrmLeadsOverviewProps {
  stages: CrmStage[];
  stageCounts: CrmLeadsStageCount[];
  totalLeads: number;
  loading?: boolean;
  employees?: Employee[];
  canAssign?: boolean;
  canViewOthers?: boolean;
  ownerEmployeeId?: string;
  onOwnerChange?: (ownerEmployeeId: string | undefined) => void;
  onOpenAllLeads: () => void;
  onOpenStage: (stageId: string) => void;
  onAddLead?: () => void;
  onImported?: () => void;
  canCreate?: boolean;
  businessTypes?: CrmBusinessType[];
  className?: string;
}

/** Stage-card landing view for the Leads hub tab. */
export function CrmLeadsOverview({
  stages,
  stageCounts,
  totalLeads,
  loading = false,
  employees = [],
  canAssign = false,
  canViewOthers = false,
  ownerEmployeeId,
  onOwnerChange,
  onOpenAllLeads,
  onOpenStage,
  onAddLead,
  onImported,
  canCreate = false,
  businessTypes = [],
  className,
}: CrmLeadsOverviewProps) {
  const { t } = useTranslation();
  const showOwnerFilter = canFilterCrmByOwner({ canAssign, canViewOthers });
  const countByStage = new Map(stageCounts.map((c) => [c.stageId, c.count]));
  const activeStages = [...stages]
    .filter((s) => s.active)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const ownerOptions = Array.isArray(employees) ? employees : [];

  if (loading) {
    return (
      <section className={cn("surface-panel p-3", className)}>
        <TableSkeleton rows={4} />
      </section>
    );
  }

  return (
    <section className={cn("min-w-0 space-y-3 sm:space-y-4", className)}>
      <div className="surface-panel max-sm:-mx-3 max-sm:rounded-none max-sm:border-x-0">
        <div className="panel-header flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold tracking-tight sm:text-sm">
              {t("crm.leads.overviewTitle")}
            </h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground sm:text-sm">
              {t("crm.leads.overviewStats", {
                total: String(totalLeads),
                stages: String(activeStages.length),
              })}
            </p>
          </div>
          <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
            {showOwnerFilter && onOwnerChange ? (
              <Select
                value={ownerEmployeeId || "all"}
                onValueChange={(v) =>
                  onOwnerChange(v === "all" ? undefined : v)
                }
              >
                <SelectTrigger
                  className="h-11 w-full touch-manipulation rounded-xl sm:h-8 sm:w-[170px] sm:rounded-lg"
                  aria-label={t("crm.filters.sales")}
                >
                  <SelectValue placeholder={t("crm.filters.allSales")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("crm.filters.allSales")}</SelectItem>
                  {ownerOptions.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2 sm:flex sm:flex-wrap sm:items-center">
              {canCreate ? (
                <CrmLeadsBulkAdd
                  stages={stages}
                  businessTypes={businessTypes}
                  employees={ownerOptions}
                  canAssign={canAssign}
                  onImported={onImported}
                  size="sm"
                  className="min-h-11 w-full rounded-xl sm:min-h-8 sm:w-auto sm:rounded-lg"
                />
              ) : null}
              {onAddLead ? (
                <Button
                  type="button"
                  size="sm"
                  className="min-h-11 touch-manipulation rounded-xl sm:min-h-8 sm:rounded-lg"
                  onClick={onAddLead}
                >
                  {t("crm.actions.addLead")}
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={cn(
                  "min-h-11 touch-manipulation rounded-xl sm:min-h-8 sm:rounded-lg",
                  !onAddLead && !canCreate
                    ? "min-[380px]:col-span-2"
                    : "min-[380px]:col-span-2 sm:col-span-1"
                )}
                onClick={onOpenAllLeads}
              >
                <LayoutList className="me-1.5 h-3.5 w-3.5" />
                {t("crm.leads.allLeads")}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5 min-[380px]:grid-cols-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4">
        <button
          type="button"
          onClick={onOpenAllLeads}
          className="group flex min-h-[112px] flex-col rounded-2xl border border-primary/20 bg-primary/[0.04] px-3.5 py-3.5 text-start transition-[background-color,transform] hover:bg-primary/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.99] touch-manipulation sm:min-h-[132px] sm:px-4 sm:py-4"
        >
          <span className="text-[13px] font-semibold text-primary">
            {t("crm.leads.allLeads")}
          </span>
          <span className="mt-auto font-mono text-[1.75rem] font-semibold tabular-nums tracking-tight text-foreground sm:text-3xl">
            {totalLeads}
          </span>
          <span className="mt-1 text-[11px] text-muted-foreground">
            {t("crm.leads.openTable")}
          </span>
        </button>

        {activeStages.map((stage) => {
          const count = countByStage.get(stage.id) ?? 0;
          const subCount = (stage.subStages ?? []).filter((s) => s.active)
            .length;
          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => onOpenStage(stage.id)}
              className="group flex min-h-[112px] min-w-0 flex-col rounded-2xl border border-border/70 bg-background px-3.5 py-3.5 text-start transition-[background-color,transform] hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.99] touch-manipulation sm:min-h-[132px] sm:px-4 sm:py-4"
            >
              <div className="flex min-w-0 items-start gap-2">
                <span
                  className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: stage.color || "#082868" }}
                  aria-hidden
                />
                <span className="line-clamp-2 text-[13px] font-semibold leading-snug">
                  {stage.name}
                </span>
              </div>
              <span className="mt-auto font-mono text-[1.75rem] font-semibold tabular-nums tracking-tight sm:text-3xl">
                {count}
              </span>
              <span className="mt-1 truncate text-[11px] text-muted-foreground">
                {subCount > 0
                  ? t("crm.leads.subStageCount", { count: String(subCount) })
                  : t(`crm.stageCategory.${stage.category}`)}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
