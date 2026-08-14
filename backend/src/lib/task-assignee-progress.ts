import { TaskStatus } from "@prisma/client";

/** Per-person completion state on a shared work task. */
export type TaskAssigneeProgress = {
  employeeId: string;
  status: TaskStatus;
  completedAt?: string | null;
  evidenceLinks?: string[];
  evidenceNotes?: string;
};

export type TaskAssigneeCompletionSummary = {
  total: number;
  completedCount: number;
  pendingCount: number;
};

type ProgressSeed = {
  status?: TaskStatus | string;
  completedAt?: string | null;
  evidenceLinks?: string[];
  evidenceNotes?: string;
};

function coerceTaskStatus(value: unknown): TaskStatus {
  const raw = String(value ?? TaskStatus.todo);
  if (raw === "completed") return TaskStatus.completed;
  if (raw === "in_progress") return TaskStatus.in_progress;
  return TaskStatus.todo;
}

function asProgressList(raw: unknown): TaskAssigneeProgress[] {
  if (!Array.isArray(raw)) return [];
  const rows: TaskAssigneeProgress[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const employeeId = String(r.employeeId ?? "").trim();
    if (!employeeId) continue;
    const status = coerceTaskStatus(r.status);
    rows.push({
      employeeId,
      status,
      completedAt:
        r.completedAt === null || r.completedAt === undefined
          ? null
          : String(r.completedAt),
      evidenceLinks: Array.isArray(r.evidenceLinks)
        ? r.evidenceLinks.map(String)
        : [],
      evidenceNotes: String(r.evidenceNotes ?? ""),
    });
  }
  return rows;
}

export function syncAssigneeProgress(
  assigneeIds: string[],
  existing: unknown,
  seed: ProgressSeed = {}
): TaskAssigneeProgress[] {
  const prev = asProgressList(existing);
  const byId = new Map(prev.map((row) => [row.employeeId, row]));
  const fallbackStatus = coerceTaskStatus(seed.status ?? TaskStatus.todo);
  const fallbackCompletedAt =
    fallbackStatus === TaskStatus.completed
      ? (seed.completedAt ?? null)
      : null;

  return assigneeIds.map((employeeId) => {
    const current = byId.get(employeeId);
    if (current) {
      return {
        ...current,
        evidenceLinks: current.evidenceLinks ?? [],
        evidenceNotes: current.evidenceNotes ?? "",
      };
    }
    return {
      employeeId,
      status: fallbackStatus,
      completedAt: fallbackCompletedAt,
      evidenceLinks: seed.evidenceLinks ?? [],
      evidenceNotes: seed.evidenceNotes ?? "",
    };
  });
}

export function rollupTaskStatus(
  progress: TaskAssigneeProgress[]
): TaskStatus {
  if (progress.length === 0) return TaskStatus.todo;
  if (progress.every((row) => row.status === TaskStatus.completed)) {
    return TaskStatus.completed;
  }
  if (
    progress.some(
      (row) =>
        row.status === TaskStatus.in_progress ||
        row.status === TaskStatus.completed
    )
  ) {
    return TaskStatus.in_progress;
  }
  return TaskStatus.todo;
}

export function rollupCompletedAtDate(
  progress: TaskAssigneeProgress[]
): Date | null {
  if (progress.length === 0) return null;
  if (!progress.every((row) => row.status === TaskStatus.completed)) {
    return null;
  }
  let latestMs = 0;
  for (const row of progress) {
    if (!row.completedAt) continue;
    const ms = Date.parse(row.completedAt);
    if (!Number.isNaN(ms) && ms > latestMs) latestMs = ms;
  }
  return latestMs > 0 ? new Date(latestMs) : new Date();
}

export function taskAssigneeCompletionSummary(
  progress: TaskAssigneeProgress[] | undefined | null
): TaskAssigneeCompletionSummary {
  const rows = asProgressList(progress);
  const completedCount = rows.filter(
    (row) => row.status === TaskStatus.completed
  ).length;
  return {
    total: rows.length,
    completedCount,
    pendingCount: Math.max(0, rows.length - completedCount),
  };
}

export function applyAssigneeStatusChange(
  progress: TaskAssigneeProgress[],
  employeeId: string,
  status: TaskStatus | string,
  evidence?: { links?: string[]; notes?: string },
  now = new Date()
): TaskAssigneeProgress[] {
  const nowIso = now.toISOString();
  const nextStatus = coerceTaskStatus(status);
  return progress.map((row) => {
    if (row.employeeId !== employeeId) return row;
    const next: TaskAssigneeProgress = {
      ...row,
      status: nextStatus,
      completedAt: nextStatus === TaskStatus.completed ? nowIso : null,
    };
    if (evidence?.links !== undefined) next.evidenceLinks = evidence.links;
    if (evidence?.notes !== undefined) next.evidenceNotes = evidence.notes;
    return next;
  });
}

export function applyStatusToAllAssignees(
  progress: TaskAssigneeProgress[],
  status: TaskStatus | string,
  evidence?: { links?: string[]; notes?: string },
  now = new Date()
): TaskAssigneeProgress[] {
  const nowIso = now.toISOString();
  const nextStatus = coerceTaskStatus(status);
  return progress.map((row) => ({
    ...row,
    status: nextStatus,
    completedAt: nextStatus === TaskStatus.completed ? nowIso : null,
    evidenceLinks:
      evidence?.links !== undefined ? evidence.links : row.evidenceLinks,
    evidenceNotes:
      evidence?.notes !== undefined ? evidence.notes : row.evidenceNotes,
  }));
}

export function findAssigneeProgress(
  progress: TaskAssigneeProgress[] | undefined | null,
  employeeId: string
): TaskAssigneeProgress | undefined {
  return asProgressList(progress).find((row) => row.employeeId === employeeId);
}

export function progressFromTaskFields(task: {
  assigneeIds: string[];
  assigneeProgress?: unknown;
  status: TaskStatus | string;
  completedAt?: Date | string | null;
  evidenceLinks?: string[] | null;
  evidenceNotes?: string | null;
}): TaskAssigneeProgress[] {
  return syncAssigneeProgress(task.assigneeIds, task.assigneeProgress, {
    status: task.status,
    completedAt: task.completedAt
      ? typeof task.completedAt === "string"
        ? task.completedAt
        : task.completedAt.toISOString()
      : null,
    evidenceLinks: task.evidenceLinks ?? [],
    evidenceNotes: task.evidenceNotes ?? "",
  });
}
