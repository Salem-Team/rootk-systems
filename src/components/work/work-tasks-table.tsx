"use client";

import { AnimatePresence } from "framer-motion";
import { ar as arLocale, enUS } from "date-fns/locale";
import { CheckCircle2, Loader2 } from "lucide-react";
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
  TaskAssigneeCell,
  TaskDueCell,
  TaskOriginCell,
  TaskPriorityPill,
  TaskRowMenu,
  TaskStatusCell,
  TaskTitleCell,
} from "@/components/work/work-tasks-table-cells";
import {
  WorkDoneButtonMotion,
  WorkMotionCard,
  WorkMotionList,
  WorkMotionRow,
  WorkMotionTableShell,
} from "@/components/work/work-motion";
import { EmptyState } from "@/components/shared/empty-state";
import { useTranslation } from "@/hooks/use-translation";
import { taskDueBucket } from "@/lib/work-utils";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types";
import type { WorkTask } from "@/types/work";

/** Responsive tasks table — desktop CRM-style rows + mobile stacked cards. */
export function WorkTasksTable({
  tasks,
  employees,
  showAssignee = false,
  busyId,
  selectedId,
  assigneeFilter,
  onView,
  onDone,
  onSelect,
  onEdit,
  onDelete,
  onSelectAssignee,
  canManage,
  emptyTitle,
  emptyDesc,
  className,
}: {
  tasks: WorkTask[];
  employees?: Map<string, Employee>;
  showAssignee?: boolean;
  busyId?: string | null;
  selectedId?: string | null;
  assigneeFilter?: string;
  onView?: (task: WorkTask) => void;
  onDone?: (task: WorkTask) => void;
  onSelect?: (task: WorkTask) => void;
  onEdit?: (task: WorkTask) => void;
  onDelete?: (task: WorkTask) => void;
  onSelectAssignee?: (id: string) => void;
  canManage?: (task: WorkTask) => boolean;
  emptyTitle?: string;
  emptyDesc?: string;
  className?: string;
}) {
  const { t, locale } = useTranslation();
  const dateLocale = locale === "ar" ? arLocale : enUS;
  const openTask = onSelect ?? onView;

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
                  onClick={() => openTask?.(task)}
                >
                  <TaskTitleCell task={task} />
                  <span className="mt-3 flex flex-wrap items-center gap-2">
                    <TaskStatusCell status={task.status} />
                    <TaskPriorityPill priority={task.priority} />
                  </span>
                  <span className="mt-2.5 block">
                    <TaskDueCell
                      dueDate={task.dueDate}
                      overdue={due === "overdue"}
                      dateLocale={dateLocale}
                    />
                  </span>
                </button>
                <div className="mt-3 flex items-center justify-between gap-2">
                  {onDone && task.status !== "completed" ? (
                    <WorkDoneButtonMotion
                      pulse={task.status === "in_progress"}
                      className="flex-1"
                    >
                      <Button
                        type="button"
                        size="sm"
                        className="w-full"
                        disabled={busy}
                        onClick={() => onDone(task)}
                      >
                        {busy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        {t("workEvidence.done")}
                      </Button>
                    </WorkDoneButtonMotion>
                  ) : (
                    <span />
                  )}
                  <TaskRowMenu
                    task={task}
                    busy={busy}
                    canManage={canManage?.(task)}
                    onView={openTask}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                </div>
              </WorkMotionCard>
            );
          })}
        </AnimatePresence>
      </WorkMotionList>

      <WorkMotionTableShell className="hidden md:block">
        <section className="surface-panel overflow-hidden">
          <DataTable embedded className="min-w-[46rem]">
            <DataTableHeader>
              <DataTableHeaderRow>
                <DataTableHead className="h-11">
                  {t("workTable.colTask")}
                </DataTableHead>
                <DataTableHead className="h-11">
                  {t("workTable.colStatus")}
                </DataTableHead>
                <DataTableHead className="hidden h-11 sm:table-cell">
                  {t("workTable.colPriority")}
                </DataTableHead>
                {showAssignee ? (
                  <DataTableHead className="hidden h-11 lg:table-cell">
                    {t("workTable.colAssignee")}
                  </DataTableHead>
                ) : null}
                <DataTableHead className="h-11">
                  {t("workTable.colDue")}
                </DataTableHead>
                <DataTableHead className="hidden h-11 xl:table-cell">
                  {t("workTable.colOrigin")}
                </DataTableHead>
                <DataTableHead className="h-11 w-12 text-end">
                  <span className="sr-only">{t("workTable.colActions")}</span>
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
                    striped
                    onClick={openTask ? () => openTask(task) : undefined}
                  >
                    <DataTableCell className="py-4">
                      <div className="min-w-0 max-w-[280px]">
                        <TaskTitleCell task={task} />
                      </div>
                    </DataTableCell>
                    <DataTableCell className="py-4 whitespace-nowrap">
                      <TaskStatusCell status={task.status} />
                    </DataTableCell>
                    <DataTableCell className="hidden py-4 sm:table-cell">
                      <TaskPriorityPill priority={task.priority} />
                    </DataTableCell>
                    {showAssignee ? (
                      <DataTableCell
                        className="hidden py-4 lg:table-cell"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <TaskAssigneeCell
                          ids={task.assigneeIds}
                          employees={employees}
                          selectedId={assigneeFilter}
                          onSelect={onSelectAssignee}
                          task={task}
                        />
                      </DataTableCell>
                    ) : null}
                    <DataTableCell className="py-4 whitespace-nowrap">
                      <TaskDueCell
                        dueDate={task.dueDate}
                        overdue={due === "overdue"}
                        dateLocale={dateLocale}
                      />
                    </DataTableCell>
                    <DataTableCell className="hidden py-4 xl:table-cell">
                      <TaskOriginCell origin={task.origin} />
                    </DataTableCell>
                    <DataTableCell
                      className="py-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-end">
                        <TaskRowMenu
                          task={task}
                          busy={busy}
                          canManage={canManage?.(task)}
                          onView={openTask}
                          onDone={onDone}
                          onEdit={onEdit}
                          onDelete={onDelete}
                        />
                      </div>
                    </DataTableCell>
                  </WorkMotionRow>
                );
              })}
            </DataTableBody>
          </DataTable>
        </section>
      </WorkMotionTableShell>
    </div>
  );
}
