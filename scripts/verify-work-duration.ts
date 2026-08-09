/**
 * Work/target duration helpers — regression checks.
 * Run: npx tsx scripts/verify-work-duration.ts
 */

import {
  averageTaskDurationMs,
  formatDurationMs,
  splitDuration,
  taskAssignedAt,
  taskDurationMs,
  targetDurationMs,
} from "../src/lib/work-duration";
import type { PerformanceTarget } from "../src/types/targets";
import type { WorkTask } from "../src/types/work";

let failed = 0;

function assert(cond: unknown, msg: string) {
  if (!cond) {
    failed += 1;
    console.error(`FAIL: ${msg}`);
  } else {
    console.log(`✓ ${msg}`);
  }
}

function t(key: string, vars?: Record<string, string | number>) {
  if (key === "workDuration.pending") return "In progress";
  if (key === "workDuration.underMinute") return "< 1m";
  if (key === "workDuration.minutes") return `${vars?.minutes}m`;
  if (key === "workDuration.hours") return `${vars?.hours}h`;
  if (key === "workDuration.hoursMinutes")
    return `${vars?.hours}h ${vars?.minutes}m`;
  if (key === "workDuration.days") return `${vars?.days}d`;
  if (key === "workDuration.daysHours") return `${vars?.days}d ${vars?.hours}h`;
  return key;
}

function baseTask(overrides: Partial<WorkTask> = {}): WorkTask {
  return {
    id: "task-1",
    title: "Demo",
    description: "",
    status: "completed",
    priority: "medium",
    dueDate: "",
    tag: "",
    estimateMin: 0,
    assigneeIds: ["emp-1"],
    subItems: [],
    origin: "assigned",
    assignedAt: "2026-08-01T10:00:00.000Z",
    completedAt: "2026-08-01T12:30:00.000Z",
    companyId: "c1",
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-01T12:30:00.000Z",
    createdBy: "",
    updatedBy: "",
    deletedAt: null,
    isArchived: false,
    version: 1,
    metadata: {},
    ...overrides,
  };
}

function main() {
  const task = baseTask();
  assert(taskAssignedAt(task) === "2026-08-01T10:00:00.000Z", "assignedAt preferred");
  assert(
    taskAssignedAt(baseTask({ assignedAt: undefined })) ===
      "2026-08-01T10:00:00.000Z",
    "fallback to createdAt"
  );

  const ms = taskDurationMs(task);
  assert(ms === 2.5 * 60 * 60 * 1000, "2h30m duration in ms");
  assert(formatDurationMs(ms, t as never) === "2h 30m", "format hours+minutes");

  const open = baseTask({ status: "todo", completedAt: null });
  assert(taskDurationMs(open) === null, "open task has no final duration");

  const parts = splitDuration(26 * 60 * 60 * 1000 + 15 * 60 * 1000);
  assert(parts.days === 1 && parts.hours === 2 && parts.minutes === 15, "split duration");

  const avg = averageTaskDurationMs([
    task,
    baseTask({
      id: "task-2",
      completedAt: "2026-08-01T11:00:00.000Z",
    }),
  ]);
  assert(avg === (2.5 * 60 + 60) * 60 * 1000 / 2, "average of two durations");

  const target = {
    id: "pt-1",
    status: "completed",
    assignedAt: "2026-08-01T08:00:00.000Z",
    completedAt: "2026-08-02T08:00:00.000Z",
    createdAt: "2026-08-01T08:00:00.000Z",
  } as PerformanceTarget;
  assert(targetDurationMs(target) === 24 * 60 * 60 * 1000, "target full-day duration");
  assert(formatDurationMs(null, t as never) === "In progress", "pending label");

  if (failed > 0) {
    console.error(`\n${failed} assertion(s) failed`);
    process.exit(1);
  }
  console.log("\nAll work-duration checks passed.");
}

main();
