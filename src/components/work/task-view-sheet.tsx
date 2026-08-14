"use client";

import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { CheckCircle2, Circle, Eye } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { EmployeeAvatarStack } from "@/components/work/employee-multi-picker";
import {
  TargetProgressRing,
  type ProgressRingTone,
} from "@/components/targets/target-progress-ring";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import {
  ensureTaskAssigneeProgress,
  taskAssigneeCompletionSummary,
} from "@/lib/task-assignee-progress";
import type { Employee } from "@/types";
import type { WorkTask } from "@/types/work";

/** Progress % for a work task (multi-assignee rollup, else status + subtasks). */
export function workTaskProgress(task: WorkTask): number {
  const progress = ensureTaskAssigneeProgress(task).assigneeProgress;
  if (progress.length > 1) {
    const { completedCount, total } = taskAssigneeCompletionSummary(progress);
    if (total === 0) return 0;
    return Math.round((completedCount / total) * 100);
  }
  if (task.status === "completed") return 100;
  if (task.subItems.length > 0) {
    const done = task.subItems.filter((s) => s.done).length;
    return Math.round((done / task.subItems.length) * 100);
  }
  if (task.status === "in_progress") return 50;
  return 0;
}

interface TaskViewSheetProps {
  task: WorkTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Map<string, Employee>;
  onEdit?: (task: WorkTask) => void;
}

/** Read-only work-task sheet with completion percentage. */
export function TaskViewSheet({
  task,
  open,
  onOpenChange,
  employees,
  onEdit,
}: TaskViewSheetProps) {
  const { t, locale } = useTranslation();
  const dateLocale = locale === "ar" ? arLocale : enUS;

  const percentage = useMemo(
    () => (task ? workTaskProgress(task) : 0),
    [task]
  );

  const tone: ProgressRingTone =
    percentage >= 100
      ? "success"
      : percentage >= 50
        ? "primary"
        : percentage > 0
          ? "warning"
          : "neutral";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {task ? (
          <>
            <SheetHeader>
              <SheetTitle className="pe-8 text-start leading-snug">
                {task.title}
              </SheetTitle>
              <SheetDescription className="text-start">
                {t("workAdmin.viewTaskDesc")}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-5">
              <div className="flex items-center gap-4 rounded-2xl border border-border/70 bg-muted/20 p-4">
                <TargetProgressRing
                  percentage={percentage}
                  size={88}
                  strokeWidth={7}
                  tone={tone}
                />
                <div className="min-w-0 space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    {t("workAdmin.taskCompletion")}
                  </p>
                  <p className="font-display text-3xl font-semibold tabular-nums tracking-tight">
                    {percentage}
                    <span className="text-lg text-muted-foreground">%</span>
                  </p>
                  <p className="text-[13px] text-muted-foreground">
                    {task.status === "todo"
                      ? t("ops.statusTodo")
                      : task.status === "in_progress"
                        ? t("ops.statusInProgress")
                        : t("ops.statusCompleted")}
                  </p>
                </div>
              </div>

              {task.description ? (
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  {task.description}
                </p>
              ) : null}

              <div>
                <p className="mb-2 text-[12px] font-semibold text-muted-foreground">
                  {t("workAdmin.assignedTo")}
                </p>
                <EmployeeAvatarStack
                  employees={employees}
                  ids={task.assigneeIds}
                  max={8}
                />
                {task.assigneeIds.length > 1 ? (
                  <p className="mt-2 text-[12px] font-medium text-foreground">
                    {t("workAdmin.assigneeCompletionSummary", {
                      done: String(
                        taskAssigneeCompletionSummary(
                          ensureTaskAssigneeProgress(task).assigneeProgress
                        ).completedCount
                      ),
                      pending: String(
                        taskAssigneeCompletionSummary(
                          ensureTaskAssigneeProgress(task).assigneeProgress
                        ).pendingCount
                      ),
                    })}
                  </p>
                ) : null}
                <ul className="mt-2 space-y-1.5">
                  {ensureTaskAssigneeProgress(task).assigneeProgress.map(
                    (row) => {
                      const name =
                        employees.get(row.employeeId)?.name ?? row.employeeId;
                      const done = row.status === "completed";
                      return (
                        <li
                          key={row.employeeId}
                          className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-2.5 py-2 text-[13px]"
                        >
                          <span className="min-w-0 truncate">{name}</span>
                          <span
                            className={cn(
                              "shrink-0 text-[11px] font-medium",
                              done
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-muted-foreground"
                            )}
                          >
                            {done
                              ? t("workTable.assigneeDone")
                              : t("workTable.assigneePending")}
                          </span>
                        </li>
                      );
                    }
                  )}
                </ul>
              </div>

              {task.subItems.length > 0 ? (
                <div>
                  <p className="mb-2 text-[12px] font-semibold text-muted-foreground">
                    {t("workHub.subtasks")} (
                    {task.subItems.filter((s) => s.done).length}/
                    {task.subItems.length})
                  </p>
                  <ul className="space-y-1.5">
                    {task.subItems.map((sub) => (
                      <li
                        key={sub.id}
                        className="flex items-center gap-2 rounded-lg border border-border/60 px-2.5 py-2 text-[13px]"
                      >
                        {sub.done ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                        ) : (
                          <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <span
                          className={cn(
                            sub.done && "text-muted-foreground line-through"
                          )}
                        >
                          {sub.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <dl className="grid gap-2.5 rounded-xl border border-border/60 p-3 text-[13px] sm:grid-cols-2">
                <div>
                  <dt className="text-[11px] text-muted-foreground">
                    {t("workAdmin.fieldPriority")}
                  </dt>
                  <dd className="mt-0.5 font-medium">
                    {t(`ops.priority.${task.priority}`)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-muted-foreground">
                    {t("workAdmin.fieldDue")}
                  </dt>
                  <dd className="mt-0.5 font-medium tabular-nums">
                    {task.dueDate
                      ? format(parseISO(task.dueDate), "d MMM yyyy · h:mm a", {
                          locale: dateLocale,
                        })
                      : t("ops.due.none")}
                  </dd>
                </div>
              </dl>

              <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
                {onEdit ? (
                  <Button
                    type="button"
                    onClick={() => {
                      onOpenChange(false);
                      onEdit(task);
                    }}
                  >
                    {t("common.edit")}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  {t("common.close")}
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

export function TaskViewButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <Button type="button" size="sm" variant="outline" onClick={onClick}>
      <Eye className="h-3.5 w-3.5" />
      {t("common.view")}
    </Button>
  );
}
