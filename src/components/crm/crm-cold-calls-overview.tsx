"use client";

import { useRef, useState } from "react";
import {
  FileSpreadsheet,
  LayoutList,
  PhoneCall,
  Plus,
  Upload,
} from "lucide-react";
import { TableSkeleton } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { CrmLeadsImportDialog } from "@/components/crm/crm-leads-import-dialog";
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
import type { CrmStage } from "@/types/crm";

export interface CrmColdCallsStageCount {
  stageId: string;
  count: number;
}

interface CrmColdCallsOverviewProps {
  stages: CrmStage[];
  stageCounts: CrmColdCallsStageCount[];
  total: number;
  loading?: boolean;
  employees?: Employee[];
  canAssign?: boolean;
  canViewOthers?: boolean;
  ownerEmployeeId?: string;
  onOwnerChange?: (ownerEmployeeId: string | undefined) => void;
  onOpenAll: () => void;
  onOpenStage: (stageId: string) => void;
  onAdd?: () => void;
  onImported?: () => void;
  canCreate?: boolean;
  className?: string;
}

/** Cold-call landing: Excel-first, same stage cards as leads, isolated totals. */
export function CrmColdCallsOverview({
  stages,
  stageCounts,
  total,
  loading = false,
  employees = [],
  canAssign = false,
  canViewOthers = false,
  ownerEmployeeId,
  onOwnerChange,
  onOpenAll,
  onOpenStage,
  onAdd,
  onImported,
  canCreate = false,
  className,
}: CrmColdCallsOverviewProps) {
  const { t } = useTranslation();
  const [importOpen, setImportOpen] = useState(false);
  const showOwnerFilter = canFilterCrmByOwner({ canAssign, canViewOthers });
  const countByStage = new Map(stageCounts.map((c) => [c.stageId, c.count]));
  const activeStages = [...stages]
    .filter((s) => s.active)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const ownerOptions = Array.isArray(employees) ? employees : [];
  const isEmpty = total === 0;

  if (loading) {
    return (
      <section className={cn("surface-panel p-3", className)}>
        <TableSkeleton rows={4} />
      </section>
    );
  }

  return (
    <section className={cn("space-y-4", className)}>
      <div className="surface-panel overflow-hidden">
        <div className="panel-header flex flex-col gap-4 sm:gap-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <PhoneCall className="h-4 w-4" aria-hidden />
                </span>
                <h2 className="text-base font-semibold tracking-tight sm:text-sm">
                  {t("crm.coldCalls.overviewTitle")}
                </h2>
                <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {t("crm.coldCalls.separateBadge")}
                </span>
              </div>
              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                {t("crm.coldCalls.overviewHint")}
              </p>
              {!isEmpty ? (
                <p className="text-[13px] text-muted-foreground">
                  {t("crm.coldCalls.overviewStats", {
                    total: String(total),
                    stages: String(activeStages.length),
                  })}
                </p>
              ) : null}
            </div>

            <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:items-end">
              {showOwnerFilter && onOwnerChange ? (
                <Select
                  value={ownerEmployeeId || "all"}
                  onValueChange={(v) =>
                    onOwnerChange(v === "all" ? undefined : v)
                  }
                >
                  <SelectTrigger
                    className="h-11 w-full touch-manipulation sm:h-9 sm:w-[170px]"
                    aria-label={t("crm.filters.sales")}
                  >
                    <SelectValue placeholder={t("crm.filters.allSales")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t("crm.filters.allSales")}
                    </SelectItem>
                    {ownerOptions.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}

              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
                {canCreate ? (
                  <Button
                    type="button"
                    className="min-h-11 touch-manipulation sm:min-h-9"
                    onClick={() => setImportOpen(true)}
                  >
                    <Upload className="me-1.5 h-4 w-4" />
                    {t("crm.coldCalls.importExcel")}
                  </Button>
                ) : null}
                {!isEmpty ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 touch-manipulation sm:min-h-9"
                    onClick={onOpenAll}
                  >
                    <LayoutList className="me-1.5 h-3.5 w-3.5" />
                    {t("crm.coldCalls.allColdCalls")}
                  </Button>
                ) : null}
                {onAdd ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="min-h-11 touch-manipulation text-muted-foreground sm:min-h-9"
                    onClick={onAdd}
                  >
                    <Plus className="me-1.5 h-3.5 w-3.5" />
                    {t("crm.actions.addColdCall")}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          {isEmpty && canCreate ? (
            <ColdCallDropHint onUpload={() => setImportOpen(true)} />
          ) : null}
        </div>
      </div>

      {!isEmpty ? (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4">
          <button
            type="button"
            onClick={onOpenAll}
            className="group flex min-h-[118px] flex-col rounded-2xl border border-primary/20 bg-primary/[0.04] px-3.5 py-3.5 text-start transition-colors hover:bg-primary/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.99] sm:min-h-[132px] sm:px-4 sm:py-4"
          >
            <span className="text-[13px] font-semibold text-primary">
              {t("crm.coldCalls.allColdCalls")}
            </span>
            <span className="mt-auto font-mono text-3xl font-semibold tabular-nums tracking-tight text-foreground">
              {total}
            </span>
            <span className="mt-1 text-[11px] text-muted-foreground">
              {t("crm.coldCalls.openTable")}
            </span>
          </button>

          {activeStages.map((stage) => {
            const count = countByStage.get(stage.id) ?? 0;
            const subCount = (stage.subStages ?? []).filter(
              (s) => s.active
            ).length;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => onOpenStage(stage.id)}
                className="group flex min-h-[118px] flex-col rounded-2xl border border-border/70 bg-background px-3.5 py-3.5 text-start transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.99] sm:min-h-[132px] sm:px-4 sm:py-4"
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
                    ? t("crm.leads.subStageCount", {
                        count: String(subCount),
                      })
                    : t(`crm.stageCategory.${stage.category}`)}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {canCreate ? (
        <CrmLeadsImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          onImported={onImported}
          recordType="cold_call"
        />
      ) : null}
    </section>
  );
}

function ColdCallDropHint({ onUpload }: { onUpload: () => void }) {
  const { t } = useTranslation();
  const btnRef = useRef<HTMLButtonElement>(null);

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={onUpload}
      className={cn(
        "group relative flex w-full flex-col items-center gap-3 rounded-2xl border border-dashed border-primary/25 bg-primary/[0.03] px-4 py-8 text-center transition-colors",
        "hover:border-primary/40 hover:bg-primary/[0.06]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      )}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-background shadow-sm ring-1 ring-border/60 transition-transform group-hover:scale-[1.03]">
        <FileSpreadsheet className="h-5 w-5 text-primary" aria-hidden />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-semibold tracking-tight">
          {t("crm.coldCalls.emptyTitle")}
        </p>
        <p className="mx-auto max-w-sm text-[13px] leading-relaxed text-muted-foreground">
          {t("crm.coldCalls.emptyHint")}
        </p>
      </div>
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-[13px] font-semibold text-primary-foreground shadow-sm">
        <Upload className="h-3.5 w-3.5" />
        {t("crm.coldCalls.importExcel")}
      </span>
    </button>
  );
}
