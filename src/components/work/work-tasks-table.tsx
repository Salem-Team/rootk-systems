"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import {
  CheckCircle2,
  Circle,
  Eye,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";
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
import { OriginBadge } from "@/components/work/employee-work-composer";
import { TaskEvidenceBadge } from "@/components/work/task-completion-evidence-dialog";
import { WorkDurationCell } from "@/components/work/work-duration-cell";
import {
  WorkDoneButtonMotion,
  WorkMotionCard,
  WorkMotionList,
  WorkMotionRow,
  WorkMotionTableShell,
  WorkStatusDot,
} from "@/components/work/work-motion";
import { PRIORITY_VARIANT } from "@/components/work/employee-work-hub-types";
import { EmptyState } from "@/components/shared/empty-state";
import { useTranslation } from "@/hooks/use-translation";
import { snappySpring } from "@/lib/animations";
import { completionNeedsEvidenceDialog } from "@/lib/task-evidence";
import { taskDueBucket } from "@/lib/work-utils";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types";
import type { WorkTask } from "@/types/work";

function statusBadgeKey(status: WorkTask["status"]) {
  if (status === "todo") return "ops.statusTodo";
  if (status === "in_progress") return "ops.statusInProgress";
  return "ops.statusCompleted";
}

function assigneeLabel(
  ids: string[],
  employees?: Map<string, Employee>
): string {
  if (!employees || ids.length === 0) return "—";
  return (
    ids
      .map((id) => employees.get(id)?.name)
      .filter(Boolean)
      .join(", ") || "—"
  );
}

/** Responsive tasks table — desktop table + mobile stacked cards with premium motion. */
export function WorkTasksTable({
  tasks,
  employees,
  showAssignee = false,
  busyId,
  selectedId,
  onView,
  onDone,
  onSelect,
  onEdit,
  onDelete,
  emptyTitle,
  emptyDesc,
  className,
}: {
  tasks: WorkTask[];
  employees?: Map<string, Employee>;
  showAssignee?: boolean;
  busyId?: string | null;
  selectedId?: string | null;
  onView?: (task: WorkTask) => void;
  onDone?: (task: WorkTask) => void;
  onSelect?: (task: WorkTask) => void;
  onEdit?: (task: WorkTask) => void;
  onDelete?: (task: WorkTask) => void;
  emptyTitle?: string;
  emptyDesc?: string;
  className?: string;
}) {
  const { t, locale } = useTranslation();
  const reduceMotion = useReducedMotion();
  const dateLocale = locale === "ar" ? arLocale : enUS;

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title={emptyTitle ?? t("ops.noTasks")}
        description={emptyDesc}
        className={className}
      />
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <WorkMotionList className="space-y-2.5 md:hidden">
        <AnimatePresence initial={false} mode="popLayout">
          {tasks.map((task) => {
            const due = taskDueBucket(task.dueDate, task.status);
            const busy = busyId === task.id;
            const selected = selectedId === task.id;
            return (
              <WorkMotionCard key={task.id} selected={selected}>
                <button
                  type="button"
                  className="w-full text-start"
                  onClick={() => onSelect?.(task) ?? onView?.(task)}
                >
                  <div className="flex items-start gap-2.5">
                    <motion.span
                      className={cn(
                        "mt-0.5",
                        task.status === "completed"
                          ? "text-emerald-600"
                          : task.status === "in_progress"
                            ? "text-sky-600"
                            : "text-muted-foreground"
                      )}
                      animate={
                        reduceMotion || task.status !== "completed"
                          ? undefined
                          : { scale: [1, 1.15, 1] }
                      }
                      transition={{ duration: 0.45 }}
                    >
                        {task.status === "completed" ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Circle className="h-4 w-4" />
                      )}
                    </motion.span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block text-[14px] font-semibold leading-snug",
                          task.status === "completed" &&
                            "text-muted-foreground line-through decoration-border"
                        )}
                      >
                        {task.title}
                      </span>
                      <span className="mt-1.5 flex flex-wrap items-center gap-1">
                        <WorkStatusDot status={task.status} className="me-0.5" />
                        <OriginBadge origin={task.origin} />
                        <Badge
                          variant={PRIORITY_VARIANT[task.priority]}
                          className="h-5"
                        >
                          {t(`ops.priority.${task.priority}`)}
                        </Badge>
                        <Badge
                          variant={due === "overdue" ? "danger" : "outline"}
                          className="h-5"
                        >
                          {t(`ops.due.${due}`)}
                        </Badge>
                        <TaskEvidenceBadge task={task} />
                      </span>
                      <span className="mt-2.5 block">
                        <WorkDurationCell task={task} />
                      </span>
                      {showAssignee ? (
                        <span className="mt-1.5 block text-[11px] text-muted-foreground">
                          {assigneeLabel(task.assigneeIds, employees)}
                        </span>
                      ) : null}
                    </span>
                  </div>
                </button>
                <div className="mt-3 flex flex-wrap gap-2">
                  {onDone && task.status !== "completed" ? (
                    <WorkDoneButtonMotion
                      pulse={task.status === "in_progress"}
                      className="flex-1"
                    >
                      <Button
                        type="button"
                        size="sm"
                        className="w-full shadow-sm"
                        disabled={busy}
                        onClick={() => onDone(task)}
                      >
                        {busy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <motion.span
                            whileHover={reduceMotion ? undefined : { scale: 1.08 }}
                            transition={snappySpring}
                            className="inline-flex"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </motion.span>
                        )}
                        {t("workEvidence.done")}
                      </Button>
                    </WorkDoneButtonMotion>
                  ) : null}
                  {onEdit ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onEdit(task)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                  {onDelete ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onDelete(task)}
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
        <DataTable className="min-w-[44rem]">
          <DataTableHeader>
            <DataTableHeaderRow>
              <DataTableHead>{t("workTable.colTask")}</DataTableHead>
              <DataTableHead>{t("workTable.colStatus")}</DataTableHead>
              {showAssignee ? (
                <DataTableHead>{t("workTable.colAssignee")}</DataTableHead>
              ) : null}
              <DataTableHead>{t("workTable.colDue")}</DataTableHead>
              <DataTableHead>{t("workTable.colDuration")}</DataTableHead>
              <DataTableHead className="w-40 text-end">
                {t("workTable.colActions")}
              </DataTableHead>
            </DataTableHeaderRow>
          </DataTableHeader>
          <DataTableBody>
            {tasks.map((task, index) => {
              const due = taskDueBucket(task.dueDate, task.status);
              const busy = busyId === task.id;
              const selected = selectedId === task.id;
              return (
                <WorkMotionRow
                  key={task.id}
                  index={index}
                  selected={selected}
                  onClick={
                    onSelect || onView
                      ? () => onSelect?.(task) ?? onView?.(task)
                      : undefined
                  }
                >
                  <DataTableCell>
                    <div className="min-w-0 max-w-[280px]">
                      <div className="flex items-center gap-2">
                        <WorkStatusDot status={task.status} />
                        <p
                          className={cn(
                            "truncate text-[13px] font-semibold",
                            task.status === "completed" &&
                              "text-muted-foreground line-through decoration-border"
                          )}
                        >
                          {task.title}
                        </p>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1 ps-4">
                        <OriginBadge origin={task.origin} />
                        <Badge
                          variant={PRIORITY_VARIANT[task.priority]}
                          className="h-5"
                        >
                          {t(`ops.priority.${task.priority}`)}
                        </Badge>
                        <TaskEvidenceBadge task={task} />
                      </div>
                    </div>
                  </DataTableCell>
                  <DataTableCell>
                    <Badge
                      variant={
                        task.status === "completed"
                          ? "success"
                          : task.status === "in_progress"
                            ? "info"
                            : "secondary"
                      }
                    >
                      {t(statusBadgeKey(task.status))}
                    </Badge>
                  </DataTableCell>
                  {showAssignee ? (
                    <DataTableCell className="max-w-[140px] truncate text-[12px] text-muted-foreground">
                      {assigneeLabel(task.assigneeIds, employees)}
                    </DataTableCell>
                  ) : null}
                  <DataTableCell className="whitespace-nowrap text-[12px] text-muted-foreground">
                    {task.dueDate
                      ? format(
                          parseISO(task.dueDate.slice(0, 10)),
                          "d MMM yyyy",
                          { locale: dateLocale }
                        )
                      : t("ops.due.none")}
                    {due === "overdue" ? (
                      <Badge variant="danger" className="ms-1.5 h-5">
                        {t("ops.due.overdue")}
                      </Badge>
                    ) : null}
                  </DataTableCell>
                  <DataTableCell>
                    <WorkDurationCell task={task} />
                  </DataTableCell>
                  <DataTableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1.5">
                      {onView || onSelect ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => onSelect?.(task) ?? onView?.(task)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {t("common.view")}
                        </Button>
                      ) : null}
                      {onDone && task.status !== "completed" ? (
                        <WorkDoneButtonMotion
                          pulse={task.status === "in_progress"}
                        >
                          <Button
                            type="button"
                            size="sm"
                            disabled={busy}
                            onClick={() => onDone(task)}
                          >
                            {busy ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                            {completionNeedsEvidenceDialog(task)
                              ? t("workEvidence.done")
                              : t("workEvidence.markComplete")}
                          </Button>
                        </WorkDoneButtonMotion>
                      ) : null}
                      {onEdit ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => onEdit(task)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                      {onDelete ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => onDelete(task)}
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
