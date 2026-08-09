"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { CheckCircle2, Eye, Loader2, Target } from "lucide-react";
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
import { TaskCompletionEvidenceDialog } from "@/components/work/task-completion-evidence-dialog";
import {
  WorkDoneButtonMotion,
  WorkMotionCard,
  WorkMotionList,
  WorkMotionRow,
  WorkMotionTableShell,
  WorkProgressBar,
} from "@/components/work/work-motion";
import { TargetStatusBadge } from "@/components/targets/target-status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { useTranslation } from "@/hooks/use-translation";
import { snappySpring } from "@/lib/animations";
import {
  averageTaskDurationMs,
  formatDurationMs,
  targetDurationMs,
} from "@/lib/work-duration";
import { cn } from "@/lib/utils";
import type { PerformanceTarget, TargetCategory } from "@/types/targets";
import type { WorkTask } from "@/types/work";

function nextOpenLinkedTask(
  target: PerformanceTarget,
  tasks: WorkTask[]
): WorkTask | null {
  const linked = tasks
    .filter((task) => task.targetId === target.id)
    .sort((a, b) => a.title.localeCompare(b.title));
  return linked.find((task) => task.status !== "completed") ?? null;
}

function progressLabel(target: PerformanceTarget): string {
  return `${target.completedQuantity}/${target.quantity}`;
}

function progressPct(target: PerformanceTarget): number {
  if (target.quantity <= 0) return 0;
  return Math.round((target.completedQuantity / target.quantity) * 100);
}

/** Employee targets table with Done → mandatory notes + premium motion. */
export function EmployeeTargetsTable({
  targets,
  categories,
  linkedTasks,
  onView,
  onTaskCompleted,
  className,
}: {
  targets: PerformanceTarget[];
  categories: Map<string, TargetCategory>;
  linkedTasks: WorkTask[];
  onView?: (target: PerformanceTarget) => void;
  onTaskCompleted?: (task: WorkTask) => void;
  className?: string;
}) {
  const { t, locale } = useTranslation();
  const reduceMotion = useReducedMotion();
  const dateLocale = locale === "ar" ? arLocale : enUS;
  const [evidenceTask, setEvidenceTask] = useState<WorkTask | null>(null);
  const [busyTargetId, setBusyTargetId] = useState<string | null>(null);

  const tasksByTarget = useMemo(() => {
    const map = new Map<string, WorkTask[]>();
    for (const task of linkedTasks) {
      if (!task.targetId) continue;
      const list = map.get(task.targetId) ?? [];
      list.push(task);
      map.set(task.targetId, list);
    }
    return map;
  }, [linkedTasks]);

  function handleDone(target: PerformanceTarget) {
    const next = nextOpenLinkedTask(target, linkedTasks);
    if (!next) return;
    setBusyTargetId(target.id);
    setEvidenceTask(next);
  }

  function handleCompleted(task: WorkTask) {
    setEvidenceTask(null);
    setBusyTargetId(null);
    onTaskCompleted?.(task);
  }

  if (targets.length === 0) {
    return (
      <EmptyState
        icon={Target}
        title={t("targets.employeePerf.emptyTargets")}
        description={t("targets.employeePerf.emptyTargetsDesc")}
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
            const linked = tasksByTarget.get(target.id) ?? [];
            const next = nextOpenLinkedTask(target, linkedTasks);
            const durationMs =
              targetDurationMs(target) ?? averageTaskDurationMs(linked);
            const busy = busyTargetId === target.id;
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
                    </p>
                  </div>
                  <TargetStatusBadge status={target.status} />
                </div>

                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="font-mono tabular-nums text-muted-foreground">
                      {progressLabel(target)} {target.unit}
                    </span>
                    <motion.span
                      key={pct}
                      initial={reduceMotion ? false : { scale: 0.9, opacity: 0.4 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="font-mono tabular-nums font-semibold text-foreground"
                    >
                      {pct}%
                    </motion.span>
                  </div>
                  <WorkProgressBar value={pct} />
                </div>

                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="font-mono tabular-nums">
                    {formatDurationMs(durationMs, t)}
                  </Badge>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  {onView ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onView(target)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      {t("common.view")}
                    </Button>
                  ) : null}
                  <WorkDoneButtonMotion
                    pulse={Boolean(next)}
                    className={onView ? undefined : "col-span-2"}
                  >
                    <Button
                      type="button"
                      size="sm"
                      className="w-full shadow-sm"
                      disabled={!next || busy}
                      onClick={() => handleDone(target)}
                    >
                      {busy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <motion.span
                          whileHover={reduceMotion ? undefined : { scale: 1.1 }}
                          transition={snappySpring}
                          className="inline-flex"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </motion.span>
                      )}
                      {t("workEvidence.done")}
                    </Button>
                  </WorkDoneButtonMotion>
                </div>
                {!next && target.status !== "completed" ? (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {t("targets.employeePerf.noOpenUnit")}
                  </p>
                ) : null}
              </WorkMotionCard>
            );
          })}
        </AnimatePresence>
      </WorkMotionList>

      <WorkMotionTableShell className="hidden md:block">
        <DataTable className="min-w-[48rem]">
          <DataTableHeader>
            <DataTableHeaderRow>
              <DataTableHead>{t("targets.table.colTarget")}</DataTableHead>
              <DataTableHead>{t("targets.table.colProgress")}</DataTableHead>
              <DataTableHead>{t("targets.table.colStatus")}</DataTableHead>
              <DataTableHead>{t("targets.table.colDeadline")}</DataTableHead>
              <DataTableHead>{t("targets.table.colDuration")}</DataTableHead>
              <DataTableHead className="w-44 text-end">
                {t("targets.table.colActions")}
              </DataTableHead>
            </DataTableHeaderRow>
          </DataTableHeader>
          <DataTableBody>
            {targets.map((target, index) => {
              const category = categories.get(target.categoryId);
              const linked = tasksByTarget.get(target.id) ?? [];
              const next = nextOpenLinkedTask(target, linkedTasks);
              const durationMs =
                targetDurationMs(target) ?? averageTaskDurationMs(linked);
              const busy = busyTargetId === target.id;
              const pct = progressPct(target);
              return (
                <WorkMotionRow key={target.id} index={index}>
                  <DataTableCell>
                    <div className="min-w-0 max-w-[260px]">
                      <p className="truncate text-[13px] font-semibold">
                        {target.title}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {category?.name ?? "—"}
                      </p>
                    </div>
                  </DataTableCell>
                  <DataTableCell>
                    <div className="min-w-[7.5rem] space-y-1.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-mono text-[12px] tabular-nums">
                          {progressLabel(target)}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {pct}%
                        </span>
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
                      {formatDurationMs(durationMs, t)}
                    </span>
                  </DataTableCell>
                  <DataTableCell>
                    <div className="flex justify-end gap-1.5">
                      {onView ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => onView(target)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {t("common.view")}
                        </Button>
                      ) : null}
                      <WorkDoneButtonMotion pulse={Boolean(next)}>
                        <Button
                          type="button"
                          size="sm"
                          disabled={!next || busy}
                          onClick={() => handleDone(target)}
                          title={
                            next
                              ? t("targets.employeePerf.doneHint")
                              : t("targets.employeePerf.noOpenUnit")
                          }
                        >
                          {busy ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          {t("workEvidence.done")}
                        </Button>
                      </WorkDoneButtonMotion>
                    </div>
                  </DataTableCell>
                </WorkMotionRow>
              );
            })}
          </DataTableBody>
        </DataTable>
      </WorkMotionTableShell>

      <TaskCompletionEvidenceDialog
        task={evidenceTask}
        open={Boolean(evidenceTask)}
        onOpenChange={(open) => {
          if (!open) {
            setEvidenceTask(null);
            setBusyTargetId(null);
          }
        }}
        onCompleted={handleCompleted}
      />
    </div>
  );
}
