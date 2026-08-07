"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { AlertTriangle, Pencil, Target, Trash2 } from "lucide-react";
import { EmployeeAvatarStack, TaskAssignees } from "@/components/work/employee-multi-picker";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-state";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { Button } from "@/components/ui/button";
import {
  TargetPriorityBadge,
  TargetRiskBadge,
  TargetStatusBadge,
} from "@/components/targets/target-status-badge";
import { TargetProgressRing, type ProgressRingTone } from "@/components/targets/target-progress-ring";
import { TargetViewButton } from "@/components/targets/target-view-sheet";
import { useTranslation } from "@/hooks/use-translation";
import { canTarget } from "@/lib/target-policies";
import { useSessionStore } from "@/stores/session-store";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types";
import type { PerformanceTarget, TargetCategory } from "@/types/targets";

const RING_TONE: Record<PerformanceTarget["health"], ProgressRingTone> = {
  excellent: "success",
  good: "success",
  average: "primary",
  warning: "warning",
  critical: "danger",
  delayed: "danger",
};

interface TargetListProps {
  targets: PerformanceTarget[];
  categories: Map<string, TargetCategory>;
  employees: Map<string, Employee>;
  loading?: boolean;
  onView?: (target: PerformanceTarget) => void;
  onEdit?: (target: PerformanceTarget) => void;
  onSendWarning?: (target: PerformanceTarget) => void;
  onDelete?: (target: PerformanceTarget) => void;
  onCreate?: () => void;
  /** Click assignee chip to filter the list by that person. */
  onAssigneeSelect?: (employeeId: string) => void;
  selectedAssigneeId?: string;
  className?: string;
}

/** Elegant list of performance targets with progress ring, metrics, and quick actions. */
export function TargetList({
  targets,
  categories,
  employees,
  loading = false,
  onView,
  onEdit,
  onSendWarning,
  onDelete,
  onCreate,
  onAssigneeSelect,
  selectedAssigneeId,
  className,
}: TargetListProps) {
  const { t, locale } = useTranslation();
  const reduceMotion = useReducedMotion();
  const role = useSessionStore((s) => s.role);
  const dateLocale = locale === "ar" ? arLocale : enUS;

  const canEdit = canTarget(role, "edit");
  const canWarn = canTarget(role, "send_warnings");
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
    <motion.ul
      variants={staggerContainer}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      className={cn("space-y-2.5", className)}
    >
      <AnimatePresence initial={false}>
        {targets.map((target) => {
          const category = categories.get(target.categoryId);
          const metrics = target.metrics;
          const percentage = metrics?.percentage ?? 0;
          const remainingDays = metrics?.remainingDays ?? 0;
          const dueSoon =
            remainingDays <= 3 &&
            target.status !== "completed" &&
            target.status !== "cancelled";

          return (
            <motion.li
              key={target.id}
              layout={!reduceMotion}
              variants={fadeInUp}
              className="rounded-2xl border border-border/70 bg-card px-4 py-3.5 shadow-[var(--shadow-card)] transition-colors hover:border-border"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 flex-1 gap-3.5">
                  <TargetProgressRing
                    percentage={percentage}
                    tone={RING_TONE[target.health]}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[15px] font-semibold leading-snug">
                        {target.title}
                      </p>
                      {category ? (
                        <span
                          className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-muted/40 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground"
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: category.color }}
                            aria-hidden
                          />
                          {category.name}
                        </span>
                      ) : null}
                    </div>
                    {target.description ? (
                      <p className="mt-1 line-clamp-2 text-[13px] text-muted-foreground">
                        {target.description}
                      </p>
                    ) : null}
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      <TargetStatusBadge status={target.status} />
                      <TargetPriorityBadge priority={target.priority} />
                      {target.riskLevel === "high" || target.riskLevel === "critical" ? (
                        <TargetRiskBadge risk={target.riskLevel} />
                      ) : null}
                      {dueSoon ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-amber-400/70 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                          <AlertTriangle className="h-3 w-3" aria-hidden />
                          {t("targets.list.dueIn", { count: remainingDays })}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-4">
                      {onAssigneeSelect ? (
                        <TaskAssignees
                          employees={employees}
                          ids={target.assigneeIds}
                          selectedId={selectedAssigneeId}
                          onSelect={onAssigneeSelect}
                          maxVisible={3}
                        />
                      ) : (
                        <EmployeeAvatarStack
                          employees={employees}
                          ids={target.assigneeIds}
                        />
                      )}
                      <span className="text-[12px] tabular-nums text-muted-foreground">
                        {target.completedQuantity}/{target.quantity} {target.unit}
                      </span>
                      <span className="text-[12px] tabular-nums text-muted-foreground">
                        {t("targets.list.performance")}: {target.performanceScore}
                      </span>
                      <span className="text-[12px] text-muted-foreground">
                        {format(parseISO(target.endDate), "d MMM yyyy", {
                          locale: dateLocale,
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {onView || canEdit || canWarn || canDelete ? (
                  <div className="flex shrink-0 gap-1.5 sm:flex-col">
                    {onView ? (
                      <TargetViewButton onClick={() => onView(target)} />
                    ) : null}
                    {canEdit && onEdit ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => onEdit(target)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        {t("common.edit")}
                      </Button>
                    ) : null}
                    {canWarn && onSendWarning ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-amber-700 hover:text-amber-800 dark:text-amber-400"
                        onClick={() => onSendWarning(target)}
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {t("targets.list.warn")}
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
                ) : null}
              </div>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </motion.ul>
  );
}
