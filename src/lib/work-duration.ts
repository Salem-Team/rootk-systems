import type { PerformanceTarget } from "@/types/targets";
import type { WorkTask } from "@/types/work";

/** Resolve the assign clock for a task (falls back to createdAt). */
export function taskAssignedAt(task: Pick<WorkTask, "assignedAt" | "createdAt">): string {
  return task.assignedAt || task.createdAt || "";
}

/** Milliseconds from assign → complete (null if still open or missing clocks). */
export function taskDurationMs(
  task: Pick<WorkTask, "assignedAt" | "createdAt" | "completedAt" | "status">
): number | null {
  if (task.status !== "completed" || !task.completedAt) return null;
  const start = Date.parse(taskAssignedAt(task));
  const end = Date.parse(task.completedAt);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  return Math.max(0, end - start);
}

/** Elapsed ms while a task is still open (assign → now), or final duration if done. */
export function taskElapsedMs(
  task: Pick<WorkTask, "assignedAt" | "createdAt" | "status" | "completedAt">
): number | null {
  if (task.status === "completed") return taskDurationMs(task);
  const start = Date.parse(taskAssignedAt(task));
  if (!Number.isFinite(start)) return null;
  return Math.max(0, Date.now() - start);
}

export function targetAssignedAt(
  target: Pick<PerformanceTarget, "assignedAt" | "createdAt" | "status">
): string {
  return target.assignedAt || target.createdAt || "";
}

export function targetDurationMs(
  target: Pick<
    PerformanceTarget,
    "assignedAt" | "createdAt" | "completedAt" | "status"
  >
): number | null {
  if (target.status !== "completed" || !target.completedAt) return null;
  const start = Date.parse(targetAssignedAt(target));
  const end = Date.parse(target.completedAt);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  return Math.max(0, end - start);
}

/** Average completion duration across completed linked tasks. */
export function averageTaskDurationMs(tasks: WorkTask[]): number | null {
  const durations = tasks
    .map((task) => taskDurationMs(task))
    .filter((ms): ms is number => ms !== null);
  if (durations.length === 0) return null;
  return Math.round(
    durations.reduce((sum, ms) => sum + ms, 0) / durations.length
  );
}

export type DurationParts = {
  days: number;
  hours: number;
  minutes: number;
  totalMinutes: number;
};

export function splitDuration(ms: number): DurationParts {
  const totalMinutes = Math.max(0, Math.round(ms / 60_000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  return { days, hours, minutes, totalMinutes };
}

type DurationTranslate = (
  key:
    | "workDuration.pending"
    | "workDuration.underMinute"
    | "workDuration.minutes"
    | "workDuration.hours"
    | "workDuration.hoursMinutes"
    | "workDuration.days"
    | "workDuration.daysHours",
  vars?: Record<string, string | number>
) => string;

/**
 * Compact human duration, e.g. "2d 3h", "45m", "1h 12m".
 * `t` receives keys under `workDuration.*`.
 */
export function formatDurationMs(
  ms: number | null | undefined,
  t: DurationTranslate
): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) {
    return t("workDuration.pending");
  }
  const { days, hours, minutes, totalMinutes } = splitDuration(ms);
  if (totalMinutes < 1) return t("workDuration.underMinute");
  if (days > 0 && hours > 0) {
    return t("workDuration.daysHours", { days, hours });
  }
  if (days > 0) return t("workDuration.days", { days });
  if (hours > 0 && minutes > 0) {
    return t("workDuration.hoursMinutes", { hours, minutes });
  }
  if (hours > 0) return t("workDuration.hours", { hours });
  return t("workDuration.minutes", { minutes });
}
