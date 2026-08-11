"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { CheckCircle2, Circle, Loader2, Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { WorkDurationCell } from "@/components/work/work-duration-cell";
import { WorkDoneButtonMotion } from "@/components/work/work-motion";
import { AppRole } from "@/constants/roles";
import { useTranslation } from "@/hooks/use-translation";
import { updateWorkTaskStatus } from "@/services/work.service";
import {
  getWorkEmployeeIdFromUser,
  useSessionStore,
} from "@/stores/session-store";
import { isAssignedTo, taskDueBucket } from "@/lib/work-utils";
import { cn } from "@/lib/utils";
import type { WorkTask } from "@/types/work";

function canActOnTask(
  task: WorkTask,
  role: string | null,
  employeeId: string
): boolean {
  if (role === AppRole.admin) return true;
  return Boolean(employeeId) && isAssignedTo(task.assigneeIds, employeeId);
}

/** Linked work units with Start / Done / Reopen from the target view sheet. */
export function TargetLinkedTasksList({
  tasks,
  loading,
  onTasksChanged,
  onDone,
}: {
  tasks: WorkTask[];
  loading: boolean;
  onTasksChanged?: (task: WorkTask) => void;
  onDone: (task: WorkTask) => void;
}) {
  const { t, locale } = useTranslation();
  const dateLocale = locale === "ar" ? arLocale : enUS;
  const role = useSessionStore((s) => s.role);
  const employeeId = useSessionStore((s) =>
    getWorkEmployeeIdFromUser(s.user)
  );
  const [busyId, setBusyId] = useState<string | null>(null);

  const tasksDone = tasks.filter((x) => x.status === "completed").length;

  async function patchStatus(task: WorkTask, status: WorkTask["status"]) {
    setBusyId(task.id);
    const res = await updateWorkTaskStatus(task.id, status);
    setBusyId(null);
    if (!res.success) {
      toast.error(res.message ?? t("common.error"));
      return;
    }
    onTasksChanged?.(res.data);
  }

  if (loading) {
    return (
      <p className="text-[13px] text-muted-foreground">{t("common.loading")}</p>
    );
  }

  if (tasks.length === 0) {
    return (
      <p className="text-[13px] text-muted-foreground">
        {t("targets.view.noLinkedTasks")}
      </p>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-muted-foreground">
            {t("targets.view.linkedTasks")}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {t("targets.view.linkedTasksHint")}
          </p>
        </div>
        <span className="font-mono text-[11px] text-muted-foreground">
          {tasksDone}/{tasks.length}
        </span>
      </div>
      <ul className="space-y-1.5">
        {tasks.map((task) => {
          const due = taskDueBucket(task.dueDate, task.status);
          const busy = busyId === task.id;
          const canAct = canActOnTask(task, role, employeeId);
          return (
            <li
              key={task.id}
              className="flex items-start gap-2 rounded-lg border border-border/60 bg-card px-2.5 py-2"
            >
              {task.status === "completed" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <Circle
                  className={cn(
                    "mt-0.5 h-4 w-4 shrink-0",
                    due === "overdue" ? "text-rose-500" : "text-muted-foreground"
                  )}
                />
              )}
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "truncate text-[13px] font-medium",
                    task.status === "completed" &&
                      "text-muted-foreground line-through decoration-border"
                  )}
                >
                  {task.title}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {task.status === "todo"
                    ? t("ops.statusTodo")
                    : task.status === "in_progress"
                      ? t("ops.statusInProgress")
                      : t("ops.statusCompleted")}
                  {task.dueDate
                    ? ` · ${format(parseISO(task.dueDate), "d MMM", { locale: dateLocale })}`
                    : ""}
                  {due === "overdue" ? ` · ${t("ops.due.overdue")}` : ""}
                </p>
                <div className="mt-1">
                  <WorkDurationCell task={task} />
                </div>
                {canAct ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {task.status === "todo" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => void patchStatus(task, "in_progress")}
                      >
                        {busy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Play className="h-3.5 w-3.5" />
                        )}
                        {t("workEvidence.startWork")}
                      </Button>
                    ) : null}
                    {task.status !== "completed" ? (
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
                          {t("workEvidence.done")}
                        </Button>
                      </WorkDoneButtonMotion>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => void patchStatus(task, "todo")}
                      >
                        {busy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5" />
                        )}
                        {t("workEvidence.reopen")}
                      </Button>
                    )}
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
