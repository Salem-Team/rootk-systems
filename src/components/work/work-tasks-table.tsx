"use client";

import { useEffect, useMemo, useRef } from "react";
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
import { ListPagination } from "@/components/shared/list-pagination";
import { useListPagination } from "@/hooks/use-list-pagination";
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
  pageSize: initialPageSize = 10,
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
  pageSize?: 10 | 20 | 50;
}) {
  const { t, locale } = useTranslation();
  const dateLocale = locale === "ar" ? arLocale : enUS;
  const openTask = onSelect ?? onView;
  const listRef = useRef<HTMLDivElement>(null);

  const fingerprint = useMemo(
    () =>
      `${assigneeFilter ?? ""}:${tasks.map((task) => task.id).join("|")}`,
    [assigneeFilter, tasks]
  );

  const { setPage, pageSize, setPageSize, slice } = useListPagination(tasks, {
    pageSize: initialPageSize,
    fingerprint,
  });

  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    listRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [slice.page, pageSize]);

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

  const pageTasks = slice.items;

  return (
    <div ref={listRef} className={cn("space-y-3", className)}>
      <WorkMotionList className="space-y-2.5 md:hidden">
        <AnimatePresence initial={false} mode="popLayout">
          {pageTasks.map((task) => {
            const due = taskDueBucket(task.dueDate, task.status);
            const busy = busyId === task.id;
            const selected = selectedId === task.id;
            return (
              <WorkMotionCard
                key={task.id}
                selected={selected}
                className="p-4"
              >
                <button
                  type="button"
                  className="w-full touch-manipulation text-start active:opacity-90"
                  onClick={() => openTask?.(task)}
                >
                  <TaskTitleCell task={task} compact={false} />
                  <span className="mt-3 flex flex-wrap items-center gap-2">
                    <TaskStatusCell status={task.status} />
                    <TaskPriorityPill priority={task.priority} />
                    {task.origin === "personal" ? (
                      <span className="text-[11px] font-medium text-muted-foreground">
                        <TaskOriginCell origin={task.origin} />
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-2.5 block">
                    <TaskDueCell
                      dueDate={task.dueDate}
                      overdue={due === "overdue"}
                      dateLocale={dateLocale}
                    />
                  </span>
                </button>
                {showAssignee ? (
                  <div className="mt-3">
                    <TaskAssigneeCell
                      ids={task.assigneeIds}
                      employees={employees}
                      selectedId={assigneeFilter}
                      onSelect={onSelectAssignee}
                      task={task}
                    />
                  </div>
                ) : null}
                <div className="mt-3.5 flex min-h-11 items-center justify-between gap-2 border-t border-border/50 pt-3.5">
                  {onDone && task.status !== "completed" ? (
                    <WorkDoneButtonMotion
                      pulse={task.status === "in_progress"}
                      className="min-w-0 flex-1"
                    >
                      <Button
                        type="button"
                        size="sm"
                        className="h-11 w-full touch-manipulation rounded-xl text-[13px] font-semibold"
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
                    <span className="min-w-0 flex-1 text-[12px] text-muted-foreground">
                      {task.status === "completed"
                        ? t("ops.statusCompleted")
                        : null}
                    </span>
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
          <DataTable embedded className="min-w-[46rem] table-fixed">
            <DataTableHeader>
              <DataTableHeaderRow>
                <DataTableHead className="h-11 w-[38%]">
                  {t("workTable.colTask")}
                </DataTableHead>
                <DataTableHead className="h-11 w-[14%]">
                  {t("workTable.colStatus")}
                </DataTableHead>
                <DataTableHead className="hidden h-11 w-[12%] sm:table-cell">
                  {t("workTable.colPriority")}
                </DataTableHead>
                {showAssignee ? (
                  <DataTableHead className="hidden h-11 w-[16%] lg:table-cell">
                    {t("workTable.colAssignee")}
                  </DataTableHead>
                ) : null}
                <DataTableHead className="h-11 w-[14%]">
                  {t("workTable.colDue")}
                </DataTableHead>
                <DataTableHead className="hidden h-11 w-[10%] xl:table-cell">
                  {t("workTable.colOrigin")}
                </DataTableHead>
                <DataTableHead className="h-11 w-12 text-end">
                  <span className="sr-only">{t("workTable.colActions")}</span>
                </DataTableHead>
              </DataTableHeaderRow>
            </DataTableHeader>
            <DataTableBody>
              {pageTasks.map((task, index) => {
                const due = taskDueBucket(task.dueDate, task.status);
                const busy = busyId === task.id;
                const selected = selectedId === task.id;
                return (
                  <WorkMotionRow
                    key={task.id}
                    index={index}
                    selected={selected}
                    striped
                    className="h-[4.25rem]"
                    onClick={openTask ? () => openTask(task) : undefined}
                  >
                    <DataTableCell className="h-[4.25rem] py-0 align-middle">
                      <div className="min-w-0 max-w-full pe-2">
                        <TaskTitleCell task={task} />
                      </div>
                    </DataTableCell>
                    <DataTableCell className="h-[4.25rem] py-0 align-middle whitespace-nowrap">
                      <TaskStatusCell status={task.status} />
                    </DataTableCell>
                    <DataTableCell className="hidden h-[4.25rem] py-0 align-middle sm:table-cell">
                      <TaskPriorityPill priority={task.priority} />
                    </DataTableCell>
                    {showAssignee ? (
                      <DataTableCell
                        className="hidden h-[4.25rem] py-0 align-middle lg:table-cell"
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
                    <DataTableCell className="h-[4.25rem] py-0 align-middle whitespace-nowrap">
                      <TaskDueCell
                        dueDate={task.dueDate}
                        overdue={due === "overdue"}
                        dateLocale={dateLocale}
                      />
                    </DataTableCell>
                    <DataTableCell className="hidden h-[4.25rem] py-0 align-middle xl:table-cell">
                      <TaskOriginCell origin={task.origin} />
                    </DataTableCell>
                    <DataTableCell
                      className="h-[4.25rem] py-0 align-middle"
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

      <ListPagination
        page={slice.page}
        totalPages={slice.totalPages}
        total={slice.total}
        from={slice.from}
        to={slice.to}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
