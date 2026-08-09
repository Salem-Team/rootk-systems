"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OriginBadge } from "@/components/work/employee-work-composer";
import { TaskEvidenceBadge } from "@/components/work/task-completion-evidence-dialog";
import { TaskDetailCard } from "@/components/work/employee-work-task-detail-card";
import { PRIORITY_VARIANT, statusLabelKey } from "@/components/work/employee-work-hub-types";
import { useTranslation } from "@/hooks/use-translation";
import { taskDueBucket } from "@/lib/work-utils";
import { employeeOwnsPersonalTask } from "@/lib/work-utils";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { cn } from "@/lib/utils";
import type { OriginFilter } from "@/components/work/employee-work-hub-types";
import type { TaskStatus, WorkMeeting, WorkTask } from "@/types/work";

export function EmployeeWorkTaskPanel({
  tasks,
  visibleTasks,
  meetings,
  selectedTask,
  originFilter,
  setOriginFilter,
  filter,
  setFilter,
  nameOf,
  workEmployeeId,
  userId,
  onSelectTask,
  onCreateTask,
  onCycleStatus,
  onToggleSub,
  onOpenMeeting,
  onEditTask,
  onDeleteTask,
}: {
  tasks: WorkTask[];
  visibleTasks: WorkTask[];
  meetings: WorkMeeting[];
  selectedTask: WorkTask | null;
  originFilter: OriginFilter;
  setOriginFilter: (v: OriginFilter) => void;
  filter: TaskStatus | "all";
  setFilter: (v: TaskStatus | "all") => void;
  nameOf: (id: string) => string;
  workEmployeeId: string;
  userId: string;
  onSelectTask: (id: string) => void;
  onCreateTask: () => void;
  onCycleStatus: (id: string) => void;
  onToggleSub: (taskId: string, subId: string) => void;
  onOpenMeeting: (id: string) => void;
  onEditTask: (task: WorkTask) => void;
  onDeleteTask: (task: WorkTask) => void;
}) {
  const { t } = useTranslation();

  return (
    <>
      <div className="mb-3 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {(["all", "assigned", "personal"] as const).map((f) => (
            <Button
              key={f}
              type="button"
              size="sm"
              variant={originFilter === f ? "default" : "outline"}
              className="h-8 rounded-full px-3 text-[12px]"
              onClick={() => setOriginFilter(f)}
            >
              {f === "all"
                ? t("common.all")
                : f === "assigned"
                  ? t("workHub.originAssigned")
                  : t("workHub.originPersonal")}
              <span className="ms-1.5 font-mono text-[10px] opacity-70">
                {f === "all"
                  ? tasks.length
                  : tasks.filter((x) => (x.origin ?? "assigned") === f).length}
              </span>
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["all", "todo", "in_progress", "completed"] as const).map((f) => (
            <Button
              key={f}
              type="button"
              size="sm"
              variant={filter === f ? "secondary" : "ghost"}
              className="h-8 rounded-full px-3 text-[12px]"
              onClick={() => setFilter(f)}
            >
              {f === "all" ? t("common.status") : t(statusLabelKey(f))}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <motion.ul
          variants={staggerContainer}
          initial={false}
          animate="visible"
          className="space-y-2 lg:col-span-5"
        >
          <AnimatePresence initial={false}>
            {visibleTasks.map((task) => {
              const active = selectedTask?.id === task.id;
              const subDone = task.subItems.filter((s) => s.done).length;
              const due = taskDueBucket(task.dueDate, task.status);
              return (
                <motion.li key={task.id} variants={fadeInUp} layout>
                  <button
                    type="button"
                    onClick={() => onSelectTask(task.id)}
                    className={cn(
                      "list-row w-full px-3.5 py-3 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                      active && "list-row-active"
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className={cn(
                          "mt-0.5",
                          task.status === "completed"
                            ? "text-emerald-600"
                            : task.status === "in_progress"
                              ? "text-sky-600"
                              : "text-muted-foreground"
                        )}
                      >
                        {task.status === "completed" ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <Circle className="h-4 w-4" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block text-[14px] font-semibold leading-snug",
                            task.status === "completed" &&
                              "text-muted-foreground line-through"
                          )}
                        >
                          {task.title}
                        </span>
                        <span className="mt-1.5 flex flex-wrap gap-1">
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
                          {task.tag ? (
                            <Badge variant="secondary" className="h-5">
                              {task.tag}
                            </Badge>
                          ) : null}
                          <TaskEvidenceBadge task={task} />
                        </span>
                        <span className="mt-2 block text-[11px] text-muted-foreground">
                          {t("workHub.subProgress", {
                            done: subDone,
                            total: task.subItems.length,
                          })}
                          {task.estimateMin > 0
                            ? ` · ${task.estimateMin} ${t("workHub.minutes")}`
                            : ""}
                        </span>
                      </span>
                    </div>
                  </button>
                </motion.li>
              );
            })}
          </AnimatePresence>
          {visibleTasks.length === 0 ? (
            <li className="rounded-2xl border border-dashed border-border/80 px-4 py-10 text-center">
              <p className="text-sm text-muted-foreground">{t("ops.noTasks")}</p>
              <Button
                type="button"
                size="sm"
                className="mt-4"
                onClick={onCreateTask}
              >
                {t("workHub.addPersonalTask")}
              </Button>
            </li>
          ) : null}
        </motion.ul>

        <div className="hidden lg:col-span-7 lg:block">
          {selectedTask ? (
            <TaskDetailCard
              task={selectedTask}
              meetings={meetings}
              nameOf={nameOf}
              onCycleStatus={() => onCycleStatus(selectedTask.id)}
              onToggleSub={(subId) => onToggleSub(selectedTask.id, subId)}
              onOpenMeeting={onOpenMeeting}
              onEdit={
                employeeOwnsPersonalTask(selectedTask, workEmployeeId, userId)
                  ? () => onEditTask(selectedTask)
                  : undefined
              }
              onDelete={
                employeeOwnsPersonalTask(selectedTask, workEmployeeId, userId)
                  ? () => onDeleteTask(selectedTask)
                  : undefined
              }
            />
          ) : null}
        </div>
      </div>
    </>
  );
}
