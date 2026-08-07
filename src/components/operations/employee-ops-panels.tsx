"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import {
  Check,
  Circle,
  Clock3,
  MapPin,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { OpsWidget } from "@/components/operations/ops-widget";
import {
  TaskCompletionEvidenceDialog,
  TaskEvidenceBadge,
} from "@/components/work/task-completion-evidence-dialog";
import { buildOpsChecklist } from "@/components/operations/operations-mock-data";
import {
  getMyWorkMeetings,
  getMyWorkTasks,
  updateWorkTaskStatus,
} from "@/services/work.service";
import { getTargets } from "@/services/targets.service";
import { useLiveReload } from "@/hooks/use-live-reload";
import { getWorkEmployeeIdFromUser, useSessionStore } from "@/stores/session-store";
import { useTranslation } from "@/hooks/use-translation";
import { TARGETS_UPDATED_EVENT, WORK_UPDATED_EVENT } from "@/lib/events";
import { formatClockRange } from "@/lib/format-time";
import {
  nextTaskStatus,
  taskRequiresEvidence,
} from "@/lib/task-evidence";
import { meetingWhen, taskDueBucket } from "@/lib/work-utils";
import { fadeInUp, snappySpring, staggerContainer } from "@/lib/animations";
import { cn } from "@/lib/utils";
import type { TaskStatus, WorkMeeting, WorkTask } from "@/types/work";
import type { PerformanceTarget } from "@/types/targets";
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

export function MeetingsWidget() {
  const { t } = useTranslation();
  const workEmployeeId = useSessionStore((s) =>
    getWorkEmployeeIdFromUser(s.user)
  );
  const [meetings, setMeetings] = useState<WorkMeeting[]>([]);

  useEffect(() => {
    void (async () => {
      const res = await getMyWorkMeetings(workEmployeeId);
      if (res.success) setMeetings(res.data);
    })();
  }, [workEmployeeId]);

  useEffect(() => {
    const onUpdate = () => {
      void (async () => {
        const res = await getMyWorkMeetings(workEmployeeId);
        if (res.success) setMeetings(res.data);
      })();
    };
    window.addEventListener(WORK_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(WORK_UPDATED_EVENT, onUpdate);
  }, [workEmployeeId]);

  const today = meetings.filter((m) => meetingWhen(m.date) === "today");
  const upcoming = meetings.filter((m) => meetingWhen(m.date) === "upcoming");

  return (
    <OpsWidget
      id="meetings"
      title={t("ops.meetingsTitle")}
      description={t("ops.meetingsDesc")}
    >
      <div className="space-y-4">
        <MeetingGroup title={t("ops.meetingsToday")} items={today} />
        <MeetingGroup title={t("ops.meetingsUpcoming")} items={upcoming} />
      </div>
    </OpsWidget>
  );
}

function MeetingGroup({
  title,
  items,
}: {
  title: string;
  items: WorkMeeting[];
}) {
  const { t, locale } = useTranslation();
  const reduceMotion = useReducedMotion();

  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <motion.ul
        variants={staggerContainer}
        initial={false}
        animate="visible"
        className="space-y-2"
      >
        {items.map((m) => (
          <motion.li
            key={m.id}
            variants={fadeInUp}
            whileHover={
              reduceMotion ? undefined : { y: -1, transition: snappySpring }
            }
            className="list-row px-3 py-2.5"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-sm font-semibold">{m.title}</p>
              <span className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                <Clock3 className="h-3 w-3" aria-hidden />
                {formatClockRange(m.startTime, m.endTime, locale)}
              </span>
            </div>
            <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" aria-hidden />
              {m.location}
            </p>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" aria-hidden />
              {m.participantIds.length} {t("workHub.people")}
            </p>
          </motion.li>
        ))}
        {items.length === 0 ? (
          <li className="px-1 py-3 text-xs text-muted-foreground">
            {t("workHub.noMeetings")}
          </li>
        ) : null}
      </motion.ul>
    </div>
  );
}

export function DailyChecklistWidget() {
  const { t } = useTranslation();
  const [items, setItems] = useState(buildOpsChecklist);
  const done = items.filter((i) => i.done).length;

  return (
    <OpsWidget
      id="checklist"
      title={t("ops.checklistTitle")}
      description={t("ops.checklistProgress", { done, total: items.length })}
    >
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() =>
                setItems((prev) =>
                  prev.map((x) =>
                    x.id === item.id ? { ...x, done: !x.done } : x
                  )
                )
              }
              className="flex w-full items-center gap-3 rounded-lg border border-border/60 px-3 py-2 text-start transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-pressed={item.done}
            >
              <span
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded border",
                  item.done
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border"
                )}
                aria-hidden
              >
                {item.done ? <Check className="h-3 w-3" /> : null}
              </span>
              <span
                className={cn(
                  "text-sm",
                  item.done && "text-muted-foreground line-through"
                )}
              >
                {t(item.labelKey)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </OpsWidget>
  );
}

export function GoalsWidget() {
  const { t } = useTranslation();
  const router = useRouter();
  const workEmployeeId = useSessionStore((s) =>
    getWorkEmployeeIdFromUser(s.user)
  );
  const [targets, setTargets] = useState<PerformanceTarget[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const res = await getTargets({ employeeId: workEmployeeId });
    if (res.success) setTargets(res.data);
    setLoading(false);
  }, [workEmployeeId]);

  useLiveReload(reload, [TARGETS_UPDATED_EVENT, WORK_UPDATED_EVENT]);

  const open = targets.filter(
    (x) => x.status !== "completed" && x.status !== "cancelled" && x.status !== "archived"
  );

  return (
    <OpsWidget
      id="goals"
      title={t("ops.goalsTitle")}
      description={t("ops.goalsDesc")}
      actions={
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-[11px]"
          onClick={() => router.push("/targets")}
        >
          {t("ops.goalsOpenAll")}
        </Button>
      }
    >
      {loading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : open.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-3 py-4 text-center">
          <p className="text-sm font-medium">{t("ops.goalsEmpty")}</p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {t("ops.goalsEmptyHint")}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {open.slice(0, 5).map((g) => {
            const pct = Math.round(
              (g.completedQuantity / Math.max(1, g.quantity)) * 100
            );
            return (
              <li key={g.id}>
                <button
                  type="button"
                  className="w-full rounded-lg text-start transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  onClick={() => router.push("/targets")}
                >
                  <div className="mb-1 flex items-center justify-between gap-2 px-1 text-sm">
                    <span className="min-w-0 truncate font-medium">{g.title}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {pct}%
                    </span>
                  </div>
                  <div className="px-1">
                    <Progress value={pct} className="h-1.5" />
                    <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <span>
                        {g.completedQuantity}/{g.quantity} {g.unit}
                      </span>
                      <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                        {t("ops.goalsAssignedBadge")}
                      </Badge>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </OpsWidget>
  );
}
