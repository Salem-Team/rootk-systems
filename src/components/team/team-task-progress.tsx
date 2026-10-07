"use client";

import { useMemo, useState } from "react";
import { ar as arLocale, enUS } from "date-fns/locale";
import { BidiText } from "@/components/shared/bidi-text";
import { EmptyState } from "@/components/shared/empty-state";
import { ListPagination } from "@/components/shared/list-pagination";
import { Button } from "@/components/ui/button";
import { statusLabelKey } from "@/components/work/employee-work-hub-types";
import {
  TaskViewSheet,
  workTaskProgress,
} from "@/components/work/task-view-sheet";
import { TaskDueCell, TaskStatusCell } from "@/components/work/work-tasks-table-cells";
import { WorkStatusDot } from "@/components/work/work-motion";
import { useListPagination } from "@/hooks/use-list-pagination";
import { useTranslation } from "@/hooks/use-translation";
import { ensureTaskAssigneeProgress } from "@/lib/task-assignee-progress";
import { taskDueBucket } from "@/lib/work-utils";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types";
import type { TaskStatus, WorkTask } from "@/types/work";

const STATUS_RANK: Record<TaskStatus, number> = {
  in_progress: 0,
  todo: 1,
  completed: 2,
};

function tasksForMembers(tasks: WorkTask[], memberIds: Set<string>) {
  return tasks
    .filter((task) => task.assigneeIds.some((id) => memberIds.has(id)))
    .sort((a, b) => {
      const byStatus = STATUS_RANK[a.status] - STATUS_RANK[b.status];
      if (byStatus !== 0) return byStatus;
      const aStamp = a.updatedAt || a.createdAt;
      const bStamp = b.updatedAt || b.createdAt;
      return bStamp.localeCompare(aStamp);
    });
}

/** Tasks a manager assigned to direct reports, with each person's real status. */
export function TeamTaskProgress({
  tasks,
  members,
  employees,
  focusEmployeeId,
  onClearFocus,
  memberIds,
}: {
  tasks: WorkTask[];
  members: Employee[];
  employees: Employee[];
  /** Assignee ids to keep. Defaults to `members`. */
  memberIds?: string[];
  focusEmployeeId?: string | null;
  onClearFocus?: () => void;
}) {
  const { t, locale } = useTranslation();
  const dateLocale = locale === "ar" ? arLocale : enUS;
  const [openTask, setOpenTask] = useState<WorkTask | null>(null);

  const employeeMap = useMemo(
    () => new Map(employees.map((employee) => [employee.id, employee])),
    [employees]
  );

  const scopedMembers = useMemo(() => {
    if (!focusEmployeeId) return members;
    const focused =
      employees.find((employee) => employee.id === focusEmployeeId) ??
      members.find((employee) => employee.id === focusEmployeeId);
    return focused ? [focused] : [];
  }, [employees, focusEmployeeId, members]);

  const visibleTasks = useMemo(() => {
    const ids = focusEmployeeId
      ? [focusEmployeeId]
      : (memberIds ?? scopedMembers.map((member) => member.id));
    return tasksForMembers(tasks, new Set(ids));
  }, [focusEmployeeId, memberIds, scopedMembers, tasks]);

  const fingerprint = `${focusEmployeeId ?? ""}:${visibleTasks.map((task) => `${task.id}:${task.status}:${task.updatedAt}`).join("|")}`;
  const { setPage, pageSize, setPageSize, slice } = useListPagination(
    visibleTasks,
    { fingerprint }
  );

  const focusName = focusEmployeeId
    ? (employeeMap.get(focusEmployeeId)?.name ?? "")
    : "";

  return (
    <section id="team-task-progress" className="mt-6 scroll-mt-24 space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-tight">
            {t("team.taskProgressTitle")}
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {focusName
              ? t("team.taskProgressFocus", { name: focusName })
              : t("team.taskProgressDesc")}
          </p>
        </div>
        {focusEmployeeId && onClearFocus ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onClearFocus}
          >
            {t("team.taskProgressClear")}
          </Button>
        ) : null}
      </div>

      {visibleTasks.length === 0 ? (
        <EmptyState
          title={t("team.taskProgressEmpty")}
          description={t("team.taskProgressEmptyDesc")}
        />
      ) : (
        <>
          <ul className="surface-panel divide-y divide-border/60 overflow-hidden">
            {slice.items.map((task) => {
              const due = taskDueBucket(task.dueDate, task.status);
              const progress = ensureTaskAssigneeProgress(task).assigneeProgress;
              return (
                <li key={task.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    className="flex w-full cursor-pointer flex-col gap-2.5 px-4 py-3.5 text-start transition-colors hover:bg-muted/40"
                    onClick={() => setOpenTask(task)}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      setOpenTask(task);
                    }}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span
                          className={cn(
                            "block text-[13px] font-semibold leading-snug",
                            task.status === "completed" &&
                              "text-muted-foreground line-through decoration-border"
                          )}
                        >
                          <BidiText text={task.title} />
                        </span>
                        <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">
                          {workTaskProgress(task)}%
                        </span>
                      </span>
                      <TaskStatusCell status={task.status} />
                    </span>
                    <span className="flex flex-col gap-1.5">
                      {progress.map((row) => {
                        const note = String(
                          row.evidenceNotes ||
                            (progress.length === 1 ? task.evidenceNotes : "") ||
                            ""
                        ).trim();
                        return (
                          <span key={row.employeeId} className="block">
                            <span className="flex flex-wrap items-center gap-1.5 text-[12px]">
                              <WorkStatusDot status={row.status} />
                              <span className="font-medium">
                                {employeeMap.get(row.employeeId)?.name ??
                                  row.employeeId}
                              </span>
                              <span className="text-muted-foreground">
                                {t(statusLabelKey(row.status))}
                              </span>
                            </span>
                            {note ? (
                              <span className="mt-0.5 block ps-3.5 text-[12px] leading-5 text-muted-foreground">
                                <BidiText text={note} />
                              </span>
                            ) : null}
                          </span>
                        );
                      })}
                    </span>
                    <TaskDueCell
                      dueDate={task.dueDate}
                      overdue={due === "overdue"}
                      dateLocale={dateLocale}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          {slice.totalPages > 1 ? (
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
          ) : null}
        </>
      )}

      <TaskViewSheet
        task={openTask}
        open={Boolean(openTask)}
        onOpenChange={(open) => {
          if (!open) setOpenTask(null);
        }}
        employees={employeeMap}
      />
    </section>
  );
}
