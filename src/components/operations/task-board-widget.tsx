"use client";

import { useCallback, useMemo, useState } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { Check, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OpsWidget } from "@/components/operations/ops-widget";
import {
  TaskCompletionEvidenceDialog,
  TaskEvidenceBadge,
} from "@/components/work/task-completion-evidence-dialog";
import {
  getMyWorkTasks,
  updateWorkTaskStatus,
} from "@/services/work.service";
import { useLiveReload } from "@/hooks/use-live-reload";
import { getWorkEmployeeIdFromUser, useSessionStore } from "@/stores/session-store";
import { useTranslation } from "@/hooks/use-translation";
import { TARGETS_UPDATED_EVENT, WORK_UPDATED_EVENT } from "@/lib/events";
import {
  nextTaskStatus,
  taskRequiresEvidence,
} from "@/lib/task-evidence";
import { taskDueBucket } from "@/lib/work-utils";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { cn } from "@/lib/utils";
import type { TaskStatus, WorkTask } from "@/types/work";
import type { TranslationPath } from "@/i18n";

const PRIORITY_VARIANT = {
  high: "danger",
  medium: "warning",
  low: "info",
} as const;

export function TaskBoardWidget() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const workEmployeeId = useSessionStore((s) =>
    getWorkEmployeeIdFromUser(s.user)
  );
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [filter, setFilter] = useState<TaskStatus | "all">("todo");
  const [evidenceTask, setEvidenceTask] = useState<WorkTask | null>(null);

  const reload = useCallback(async () => {
    const res = await getMyWorkTasks(workEmployeeId);
    if (res.success) setTasks(res.data);
  }, [workEmployeeId]);

  useLiveReload(reload, [WORK_UPDATED_EVENT, TARGETS_UPDATED_EVENT]);

  const columns: { id: TaskStatus; label: string }[] = [
    { id: "todo", label: t("ops.statusTodo") },
    { id: "in_progress", label: t("ops.statusInProgress") },
    { id: "completed", label: t("ops.statusCompleted") },
  ];

  const visible = useMemo(
    () => (filter === "all" ? tasks : tasks.filter((x) => x.status === filter)),
    [tasks, filter]
  );

  async function cycleStatus(task: WorkTask) {
    const next = nextTaskStatus(task.status);
    if (next === "completed" && taskRequiresEvidence(task)) {
      setEvidenceTask(task);
      return;
    }
    setTasks((prev) =>
      prev.map((x) => (x.id === task.id ? { ...x, status: next } : x))
    );
    const res = await updateWorkTaskStatus(task.id, next);
    if (!res.success) await reload();
  }

  return (
    <>
    <OpsWidget
      id="tasks"
      title={t("ops.tasksTitle")}
      description={t("ops.tasksDesc")}
      actions={
        <div className="-mx-1 flex max-w-full gap-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {(["all", "todo", "in_progress", "completed"] as const).map((f) => (
            <Button
              key={f}
              type="button"
              size="sm"
              variant={filter === f ? "default" : "ghost"}
              className="h-7 shrink-0 px-2 text-[11px]"
              onClick={() => setFilter(f)}
            >
              {f === "all"
                ? t("common.all")
                : t(
                    `ops.status${f === "todo" ? "Todo" : f === "in_progress" ? "InProgress" : "Completed"}` as TranslationPath
                  )}
            </Button>
          ))}
        </div>
      }
    >
      <div className="grid gap-3 lg:grid-cols-3">
        {columns.map((col) => {
          const items = visible.filter((x) => x.status === col.id);
          if (filter !== "all" && filter !== col.id) return null;
          return (
            <div
              key={col.id}
              className="rounded-xl border border-border/60 bg-muted/15 p-2.5"
            >
              <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {col.label} · {items.length}
              </p>
              <motion.ul
                variants={staggerContainer}
                initial={false}
                animate="visible"
                className="space-y-2"
              >
                <AnimatePresence initial={false}>
                  {items.map((task) => {
                    const due = taskDueBucket(task.dueDate, task.status);
                    return (
                      <motion.li
                        key={task.id}
                        layout={!reduceMotion}
                        variants={fadeInUp}
                        initial={false}
                        exit={{ opacity: 0, scale: 0.96 }}
                        className={cn(
                          "rounded-lg border border-border/70 bg-card px-3 py-2.5 shadow-sm",
                          task.status === "completed" && "opacity-70"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => void cycleStatus(task)}
                            className="flex min-w-0 flex-1 items-start gap-2 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            aria-label={t("ops.cycleTaskStatus")}
                          >
                            <span className="mt-0.5 text-primary">
                              {task.status === "completed" ? (
                                <Check className="h-3.5 w-3.5" aria-hidden />
                              ) : (
                                <Circle className="h-3.5 w-3.5" aria-hidden />
                              )}
                            </span>
                            <span className="min-w-0">
                              <span
                                className={cn(
                                  "block text-[13px] font-medium",
                                  task.status === "completed" && "line-through"
                                )}
                              >
                                {task.title}
                              </span>
                              <span className="mt-1 flex flex-wrap gap-1">
                                <Badge
                                  variant={PRIORITY_VARIANT[task.priority]}
                                  className="h-5"
                                >
                                  {t(`ops.priority.${task.priority}`)}
                                </Badge>
                                <Badge variant="outline" className="h-5">
                                  {t(`ops.due.${due}`)}
                                </Badge>
                                <TaskEvidenceBadge task={task} />
                              </span>
                            </span>
                          </button>
                        </div>
                        {task.tag ? (
                          <p className="mt-1.5 text-[10px] text-muted-foreground">
                            {task.tag}
                          </p>
                        ) : null}
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
                {items.length === 0 ? (
                  <li className="px-1 py-3 text-xs text-muted-foreground">
                    {t("ops.noTasks")}
                  </li>
                ) : null}
              </motion.ul>
            </div>
          );
        })}
      </div>
    </OpsWidget>
      <TaskCompletionEvidenceDialog
        task={evidenceTask}
        open={Boolean(evidenceTask)}
        onOpenChange={(open) => {
          if (!open) setEvidenceTask(null);
        }}
        onCompleted={(updated) => {
          setTasks((prev) =>
            prev.map((x) => (x.id === updated.id ? updated : x))
          );
          setEvidenceTask(null);
        }}
      />
    </>
  );
}
