"use client";

import type { Locale } from "date-fns";
import { format, parseISO } from "date-fns";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Clock3, ListTodo, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TaskAssignees } from "@/components/work/employee-multi-picker";
import {
  TaskEvidenceBadge,
  TaskEvidenceDisplay,
} from "@/components/work/task-completion-evidence-dialog";
import { TaskViewButton } from "@/components/work/task-view-sheet";
import { PRIORITY_VARIANT } from "@/components/work/admin-work-panel-types";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { taskDueBucket } from "@/lib/work-utils";
import { taskHasSubmittedEvidence } from "@/lib/task-evidence";
import type { Employee } from "@/types";
import type { WorkTask } from "@/types/work";

export function AdminWorkTaskList({
  tasks,
  employeeMap,
  assigneeFilter,
  onSelectAssignee,
  dateLocale,
  onView,
  onEdit,
  onDeleteRequest,
  onCreateTask,
}: {
  tasks: WorkTask[];
  employeeMap: Map<string, Employee>;
  assigneeFilter: string;
  onSelectAssignee: (id: string) => void;
  dateLocale: Locale;
  onView: (task: WorkTask) => void;
  onEdit: (task: WorkTask) => void;
  onDeleteRequest: (task: WorkTask) => void;
  onCreateTask: () => void;
}) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

  return (
    <motion.ul
      variants={staggerContainer}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      className="space-y-2"
    >
      <AnimatePresence initial={false}>
        {tasks.map((task) => {
          const due = taskDueBucket(task.dueDate, task.status);
          const subDone = task.subItems.filter((s) => s.done).length;
          return (
            <motion.li
              key={task.id}
              layout={!reduceMotion}
              variants={fadeInUp}
              className="rounded-2xl border border-border/70 bg-card px-4 py-3.5 shadow-[var(--shadow-card)] transition-colors hover:border-border"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[15px] font-semibold leading-snug">
                      {task.title}
                    </p>
                    {due === "overdue" ? (
                      <Badge variant="danger">{t("ops.due.overdue")}</Badge>
                    ) : null}
                  </div>
                  {task.description ? (
                    <p className="mt-1 line-clamp-2 text-[13px] text-muted-foreground">
                      {task.description}
                    </p>
                  ) : null}
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <Badge variant={PRIORITY_VARIANT[task.priority]}>
                      {t(`ops.priority.${task.priority}`)}
                    </Badge>
                    <Badge variant="secondary">
                      {t(
                        `ops.status${
                          task.status === "todo"
                            ? "Todo"
                            : task.status === "in_progress"
                              ? "InProgress"
                              : "Completed"
                        }`
                      )}
                    </Badge>
                    {task.tag ? (
                      <Badge variant="outline">{task.tag}</Badge>
                    ) : null}
                    {task.subItems.length > 0 ? (
                      <Badge variant="outline">
                        {subDone}/{task.subItems.length}{" "}
                        {t("workHub.subtasks")}
                      </Badge>
                    ) : null}
                    <TaskEvidenceBadge task={task} />
                  </div>
                  {taskHasSubmittedEvidence(task) ? (
                    <TaskEvidenceDisplay task={task} className="mt-3" />
                  ) : null}
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2">
                    <TaskAssignees
                      employees={employeeMap}
                      ids={task.assigneeIds}
                      selectedId={assigneeFilter}
                      onSelect={onSelectAssignee}
                      label={t("workAdmin.assignedTo")}
                      pickLabel={t("workAdmin.pickAssignee")}
                    />
                    <span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground">
                      <Clock3 className="h-3.5 w-3.5" />
                      {task.dueDate
                        ? format(parseISO(task.dueDate), "d MMM yyyy · h:mm a", {
                            locale: dateLocale,
                          })
                        : t("ops.due.none")}
                      {task.estimateMin > 0 ? (
                        <>
                          <span className="text-border">·</span>
                          {task.estimateMin} {t("workHub.minutes")}
                        </>
                      ) : null}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <TaskViewButton onClick={() => onView(task)} />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onEdit(task)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {t("common.edit")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => onDeleteRequest(task)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </motion.li>
          );
        })}
      </AnimatePresence>
      {tasks.length === 0 ? (
        <li className="rounded-2xl border border-dashed border-border/80 px-4 py-14 text-center">
          <ListTodo className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium text-foreground">
            {t("workAdmin.emptyTasks")}
          </p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {t("workAdmin.emptyTasksHint")}
          </p>
          <Button
            type="button"
            className="mt-4"
            size="sm"
            onClick={onCreateTask}
          >
            <Plus className="h-4 w-4" />
            {t("workAdmin.addTask")}
          </Button>
        </li>
      ) : null}
    </motion.ul>
  );
}
