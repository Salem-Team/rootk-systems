"use client";

import { LayoutList } from "lucide-react";
import { TableSkeleton } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types";
import type { CrmStage } from "@/types/crm";

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
  ownerEmployeeId?: string;
  onOwnerChange?: (ownerEmployeeId: string | undefined) => void;
  onOpenAllLeads: () => void;
  onOpenStage: (stageId: string) => void;
  onAddLead?: () => void;
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
  ownerEmployeeId,
  onOwnerChange,
  onOpenAllLeads,
  onOpenStage,
  onAddLead,
  className,
}: CrmLeadsOverviewProps) {
  const { t } = useTranslation();
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
    <section className={cn("space-y-4", className)}>
      <div className="surface-panel">
        <div className="panel-header flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">
              {t("crm.leads.overviewTitle")}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {t("crm.leads.overviewStats", {
                total: String(totalLeads),
                stages: String(activeStages.length),
              })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canAssign && onOwnerChange ? (
              <Select
                value={ownerEmployeeId || "all"}
                onValueChange={(v) =>
                  onOwnerChange(v === "all" ? undefined : v)
                }
              >
                <SelectTrigger
                  className="h-8 w-[170px]"
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
            {onAddLead ? (
              <Button type="button" size="sm" onClick={onAddLead}>
                {t("crm.actions.addLead")}
              </Button>
            ) : null}
            <Button type="button" size="sm" variant="outline" onClick={onOpenAllLeads}>
              <LayoutList className="me-1.5 h-3.5 w-3.5" />
              {t("crm.leads.allLeads")}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <button
          type="button"
          onClick={onOpenAllLeads}
          className="group flex min-h-[132px] flex-col rounded-2xl border border-primary/20 bg-primary/[0.04] px-4 py-4 text-start transition-colors hover:bg-primary/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="text-[13px] font-semibold text-primary">
            {t("crm.leads.allLeads")}
          </span>
          <span className="mt-auto font-mono text-3xl font-semibold tabular-nums tracking-tight text-foreground">
            {totalLeads}
          </span>
          <span className="mt-1 text-[11px] text-muted-foreground">
            {t("crm.leads.openTable")}
          </span>
        </button>

        {activeStages.map((stage) => {
          const count = countByStage.get(stage.id) ?? 0;
          const subCount = (stage.subStages ?? []).filter((s) => s.active).length;
          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => onOpenStage(stage.id)}
              className="group flex min-h-[132px] flex-col rounded-2xl border border-border/70 bg-background px-4 py-4 text-start transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex items-start gap-2">
                <span
                  className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: stage.color || "#082868" }}
                  aria-hidden
                />
                <span className="truncate text-[13px] font-semibold">
                  {stage.name}
                </span>
              </div>
              <span className="mt-auto font-mono text-3xl font-semibold tabular-nums tracking-tight">
                {count}
              </span>
              <span className="mt-1 text-[11px] text-muted-foreground">
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
