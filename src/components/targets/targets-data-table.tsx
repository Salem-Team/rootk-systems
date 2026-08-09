"use client";

import { AnimatePresence } from "framer-motion";
import { format, parseISO } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { Eye, Pencil, Target, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableHeaderRow,
} from "@/components/ui/data-table";
import {
  TargetPriorityBadge,
  TargetStatusBadge,
} from "@/components/targets/target-status-badge";
import {
  WorkMotionCard,
  WorkMotionList,
  WorkMotionRow,
  WorkMotionTableShell,
  WorkProgressBar,
} from "@/components/work/work-motion";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-state";
import { useTranslation } from "@/hooks/use-translation";
import {
  formatDurationMs,
  targetDurationMs,
} from "@/lib/work-duration";
import { canTarget } from "@/lib/target-policies";
import { useSessionStore } from "@/stores/session-store";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types";
import type { PerformanceTarget, TargetCategory } from "@/types/targets";

function progressPct(target: PerformanceTarget): number {
  if (target.quantity <= 0) return 0;
  return Math.round((target.completedQuantity / target.quantity) * 100);
}

/** Responsive admin targets table with assign→done duration + motion. */
export function TargetsDataTable({
  targets,
  categories,
  employees,
  loading = false,
  onView,
  onEdit,
  onDelete,
  onCreate,
  className,
}: {
  targets: PerformanceTarget[];
  categories: Map<string, TargetCategory>;
  employees: Map<string, Employee>;
  loading?: boolean;
  onView?: (target: PerformanceTarget) => void;
  onEdit?: (target: PerformanceTarget) => void;
  onDelete?: (target: PerformanceTarget) => void;
  onCreate?: () => void;
  className?: string;
}) {
  const { t, locale } = useTranslation();
  const role = useSessionStore((s) => s.role);
  const dateLocale = locale === "ar" ? arLocale : enUS;
  const canEdit = canTarget(role, "edit");
  const canDelete = canTarget(role, "delete");

  if (loading) return <TableSkeleton rows={5} />;

  if (targets.length === 0) {
    return (
      <EmptyState
        icon={Target}
        title={t("targets.list.empty")}
        description={t("targets.list.emptyDesc")}
        actionLabel={onCreate ? t("targets.assign.title") : undefined}
        onAction={onCreate}
        className={className}
      />
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <WorkMotionList className="space-y-2.5 md:hidden">
        <AnimatePresence initial={false} mode="popLayout">
          {targets.map((target) => {
            const category = categories.get(target.categoryId);
            const names = target.assigneeIds
              .map((id) => employees.get(id)?.name)
              .filter(Boolean)
              .join(", ");
            const pct = progressPct(target);
            return (
              <WorkMotionCard key={target.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold leading-snug">
                      {target.title}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {category?.name ?? "—"}
                      {names ? ` · ${names}` : ""}
                    </p>
                  </div>
                  <TargetStatusBadge status={target.status} />
                </div>
                <div className="mt-3 space-y-1.5">
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span className="font-mono tabular-nums">
                      {target.completedQuantity}/{target.quantity} {target.unit}
                    </span>
                    <span className="font-mono tabular-nums font-medium text-foreground">
                      {pct}%
                    </span>
                  </div>
                  <WorkProgressBar value={pct} />
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="font-mono tabular-nums">
                    {formatDurationMs(targetDurationMs(target), t)}
                  </Badge>
                  <TargetPriorityBadge priority={target.priority} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {onView ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => onView(target)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      {t("common.view")}
                    </Button>
                  ) : null}
                  {canEdit && onEdit ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onEdit(target)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                  {canDelete && onDelete ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onDelete(target)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                </div>
              </WorkMotionCard>
            );
          })}
        </AnimatePresence>
      </WorkMotionList>

      <WorkMotionTableShell className="hidden md:block">
        <DataTable className="min-w-[52rem]">
          <DataTableHeader>
            <DataTableHeaderRow>
              <DataTableHead>{t("targets.table.colTarget")}</DataTableHead>
              <DataTableHead>{t("targets.table.colAssignee")}</DataTableHead>
              <DataTableHead>{t("targets.table.colProgress")}</DataTableHead>
              <DataTableHead>{t("targets.table.colStatus")}</DataTableHead>
              <DataTableHead>{t("targets.table.colDeadline")}</DataTableHead>
              <DataTableHead>{t("targets.table.colDuration")}</DataTableHead>
              <DataTableHead className="w-36 text-end">
                {t("targets.table.colActions")}
              </DataTableHead>
            </DataTableHeaderRow>
          </DataTableHeader>
          <DataTableBody>
            {targets.map((target, index) => {
              const category = categories.get(target.categoryId);
              const names = target.assigneeIds
                .map((id) => employees.get(id)?.name)
                .filter(Boolean)
                .join(", ");
              const pct = progressPct(target);
              return (
                <WorkMotionRow
                  key={target.id}
                  index={index}
                  onClick={onView ? () => onView(target) : undefined}
                >
                  <DataTableCell>
                    <div className="min-w-0 max-w-[240px]">
                      <p className="truncate text-[13px] font-semibold">
                        {target.title}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {category?.name ?? "—"}
                      </p>
                    </div>
                  </DataTableCell>
                  <DataTableCell className="max-w-[140px] truncate text-[12px] text-muted-foreground">
                    {names || "—"}
                  </DataTableCell>
                  <DataTableCell>
                    <div className="min-w-[7.5rem] space-y-1.5">
                      <div className="flex items-baseline justify-between gap-2 font-mono text-[12px] tabular-nums">
                        <span>
                          {target.completedQuantity}/{target.quantity}
                        </span>
                        <span className="text-muted-foreground">{pct}%</span>
                      </div>
                      <WorkProgressBar value={pct} />
                    </div>
                  </DataTableCell>
                  <DataTableCell>
                    <TargetStatusBadge status={target.status} />
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap text-[12px] text-muted-foreground">
                    {format(parseISO(target.endDate.slice(0, 10)), "d MMM yyyy", {
                      locale: dateLocale,
                    })}
                  </DataTableCell>
                  <DataTableCell>
                    <span className="inline-flex rounded-full bg-muted/70 px-2 py-0.5 font-mono text-[11px] tabular-nums text-muted-foreground ring-1 ring-border/60">
                      {formatDurationMs(targetDurationMs(target), t)}
                    </span>
                  </DataTableCell>
                  <DataTableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1.5">
                      {onView ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => onView(target)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                      {canEdit && onEdit ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => onEdit(target)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                      {canDelete && onDelete ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => onDelete(target)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                    </div>
                  </DataTableCell>
                </WorkMotionRow>
              );
            })}
          </DataTableBody>
        </DataTable>
      </WorkMotionTableShell>
    </div>
  );
}
