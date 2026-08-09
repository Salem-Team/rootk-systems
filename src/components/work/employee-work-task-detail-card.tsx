"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check, Pencil, Trash2, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { MetaChip } from "@/components/shared/meta-chip";
import { OriginBadge } from "@/components/work/employee-work-composer";
import {
  TaskEvidenceBadge,
  TaskEvidenceDisplay,
} from "@/components/work/task-completion-evidence-dialog";
import { WorkDoneButtonMotion, WorkStatusDot } from "@/components/work/work-motion";
import { PRIORITY_VARIANT, statusLabelKey } from "@/components/work/employee-work-hub-types";
import { useTranslation } from "@/hooks/use-translation";
import { formatClockRange } from "@/lib/format-time";
import { WorkDurationCell } from "@/components/work/work-duration-cell";
import { taskDueBucket } from "@/lib/work-utils";
import { snappySpring } from "@/lib/animations";
import { cn } from "@/lib/utils";
import type { WorkMeeting, WorkTask } from "@/types/work";

export function TaskDetailCard({
  task,
  meetings,
  nameOf,
  embedded,
  onCycleStatus,
  onToggleSub,
  onOpenMeeting,
  onEdit,
  onDelete,
}: {
  task: WorkTask;
  meetings: WorkMeeting[];
  nameOf: (id: string) => string;
  embedded?: boolean;
  onCycleStatus: () => void;
  onToggleSub: (subId: string) => void;
  onOpenMeeting: (id: string) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const { t, locale } = useTranslation();
  const reduceMotion = useReducedMotion();
  const related = meetings.find((m) => m.id === task.relatedMeetingId);
  const subDone = task.subItems.filter((s) => s.done).length;
  const subPct = Math.round((subDone / Math.max(task.subItems.length, 1)) * 100);
  const due = taskDueBucket(task.dueDate, task.status);
  const ownerLabel = task.assigneeIds.map(nameOf).join(", ");

  return (
    <motion.article
      key={task.id}
      initial={embedded ? false : { opacity: 0.01, y: 10, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={snappySpring}
      className={cn(
        "relative overflow-hidden",
        !embedded &&
          "rounded-2xl border border-border/70 bg-card p-5 shadow-[var(--shadow-card)] sm:p-6"
      )}
    >
      {!embedded ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-primary/[0.06] to-transparent"
        />
      ) : null}
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <WorkStatusDot status={task.status} />
            {t("workHub.taskDetail")}
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-tight">{task.title}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {onEdit ? (
            <Button type="button" size="sm" variant="outline" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
              {t("common.edit")}
            </Button>
          ) : null}
          {onDelete ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          ) : null}
          <WorkDoneButtonMotion pulse={task.status === "in_progress"}>
            <motion.div
              whileHover={reduceMotion ? undefined : { scale: 1.03 }}
              whileTap={reduceMotion ? undefined : { scale: 0.97 }}
            >
              <Button
                type="button"
                size="sm"
                variant={task.status === "in_progress" ? "default" : "outline"}
                className={
                  task.status === "in_progress"
                    ? "shadow-[0_10px_22px_-14px_hsl(var(--primary)/0.85)]"
                    : undefined
                }
                onClick={onCycleStatus}
              >
                {task.status === "completed"
                  ? t("workEvidence.reopen")
                  : task.status === "todo"
                    ? t("workEvidence.startWork")
                    : t("workEvidence.done")}
              </Button>
            </motion.div>
          </WorkDoneButtonMotion>
        </div>
      </div>

      <div className="relative mt-3 flex flex-wrap gap-1.5">
        <OriginBadge origin={task.origin} />
        <Badge variant={PRIORITY_VARIANT[task.priority]}>
          {t(`ops.priority.${task.priority}`)}
        </Badge>
        <Badge variant={due === "overdue" ? "danger" : "outline"}>
          {t(`ops.due.${due}`)}
        </Badge>
        <Badge
          variant={
            task.status === "completed"
              ? "success"
              : task.status === "in_progress"
                ? "info"
                : "secondary"
          }
        >
          {t(statusLabelKey(task.status))}
        </Badge>
        {task.tag ? <Badge variant="outline">{task.tag}</Badge> : null}
        <TaskEvidenceBadge task={task} />
      </div>

      {task.description ? (
        <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground">
          {task.description}
        </p>
      ) : null}

      <TaskEvidenceDisplay task={task} className="mt-4" />

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <MetaChip label={t("workHub.owner")} value={ownerLabel || "—"} />
        <MetaChip
          label={t("workHub.estimate")}
          value={
            task.estimateMin > 0
              ? `${task.estimateMin} ${t("workHub.minutes")}`
              : "—"
          }
        />
        <MetaChip
          label={t("workTable.colDuration")}
          value={<WorkDurationCell task={task} />}
        />
      </div>

      {task.subItems.length > 0 ? (
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[13px] font-semibold">{t("workHub.subtasks")}</h3>
            <span className="font-mono text-[11px] text-muted-foreground">
              {subDone}/{task.subItems.length} · {subPct}%
            </span>
          </div>
          <Progress value={subPct} className="mb-3 h-1.5" />
          <ul className="space-y-2">
            {task.subItems.map((sub) => (
              <li key={sub.id}>
                <button
                  type="button"
                  onClick={() => onToggleSub(sub.id)}
                  className="flex w-full items-center gap-2.5 rounded-xl border border-border/60 px-3 py-2 text-start text-sm hover:bg-muted/40"
                  aria-pressed={sub.done}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded border",
                      sub.done
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border"
                    )}
                  >
                    {sub.done ? <Check className="h-3 w-3" /> : null}
                  </span>
                  <span
                    className={cn(sub.done && "text-muted-foreground line-through")}
                  >
                    {sub.label}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {related ? (
        <button
          type="button"
          onClick={() => onOpenMeeting(related.id)}
          className="mt-5 flex w-full items-start gap-3 rounded-xl border border-sky-500/20 bg-sky-500/[0.06] px-3.5 py-3 text-start transition-colors hover:bg-sky-500/[0.1]"
        >
          <Video className="mt-0.5 h-4 w-4 text-sky-700 dark:text-sky-300" />
          <span>
            <span className="block text-[12px] font-semibold text-sky-800 dark:text-sky-200">
              {t("workHub.relatedMeeting")}
            </span>
            <span className="mt-0.5 block text-sm font-medium">
              {related.title}
            </span>
            <span className="mt-0.5 block text-[12px] text-muted-foreground">
              {formatClockRange(related.startTime, related.endTime, locale)} ·{" "}
              {related.location}
            </span>
          </span>
        </button>
      ) : null}
    </motion.article>
  );
}
