import type { TaskStatus, WorkTask } from "@/types/work";

/** Per-person completion state on a shared work task. */
export interface TaskAssigneeProgress {
  employeeId: string;
  status: TaskStatus;
  completedAt?: string | null;
  evidenceLinks?: string[];
  evidenceNotes?: string;
  evidenceMedia?: Array<{
    id: string;
    kind: "image" | "video";
    mime: string;
    name: string;
    sizeBytes: number;
  }>;
}

export interface TaskAssigneeCompletionSummary {
  total: number;
  completedCount: number;
  pendingCount: number;
}

type ProgressSeed = {
  status?: TaskStatus;
  completedAt?: string | null;
  evidenceLinks?: string[];
  evidenceNotes?: string;
  evidenceMedia?: TaskAssigneeProgress["evidenceMedia"];
};

function asEvidenceMedia(raw: unknown): TaskAssigneeProgress["evidenceMedia"] {
  if (!Array.isArray(raw)) return [];
  const out: NonNullable<TaskAssigneeProgress["evidenceMedia"]> = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const id = String(row.id ?? "").trim();
    const kind = row.kind === "video" ? "video" : row.kind === "image" ? "image" : null;
    const mime = String(row.mime ?? "").trim();
    if (!id || !kind || !mime) continue;
    out.push({
      id,
      kind,
      mime,
      name: String(row.name ?? "media").slice(0, 120),
      sizeBytes: Math.max(0, Number(row.sizeBytes ?? 0) || 0),
    });
  }
  return out.slice(0, 8);
}

function asProgressList(raw: unknown): TaskAssigneeProgress[] {
  if (!Array.isArray(raw)) return [];
  const rows: TaskAssigneeProgress[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const employeeId = String(r.employeeId ?? "").trim();
    if (!employeeId) continue;
    const statusRaw = String(r.status ?? "todo");
    const status: TaskStatus =
      statusRaw === "completed" ||
      statusRaw === "in_progress" ||
      statusRaw === "todo"
        ? statusRaw
        : "todo";
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
      evidenceMedia: asEvidenceMedia(r.evidenceMedia),
    });
  }
  return rows;
}

/** Build progress rows aligned to assigneeIds (legacy tasks get one shared status). */
export function syncAssigneeProgress(
  assigneeIds: string[],
  existing: unknown,
  seed: ProgressSeed = {}
): TaskAssigneeProgress[] {
  const prev = asProgressList(existing);
  const byId = new Map(prev.map((row) => [row.employeeId, row]));
  const fallbackStatus = seed.status ?? "todo";
  const fallbackCompletedAt =
    fallbackStatus === "completed"
      ? (seed.completedAt ?? null)
      : null;

  return assigneeIds.map((employeeId) => {
    const current = byId.get(employeeId);
    if (current) {
      return {
        ...current,
        evidenceLinks: current.evidenceLinks ?? [],
        evidenceNotes: current.evidenceNotes ?? "",
        evidenceMedia: current.evidenceMedia ?? [],
      };
    }
    return {
      employeeId,
      status: fallbackStatus,
      completedAt: fallbackCompletedAt,
      evidenceLinks: seed.evidenceLinks ?? [],
      evidenceNotes: seed.evidenceNotes ?? "",
      evidenceMedia: seed.evidenceMedia ?? [],
    };
  });
}

/** Aggregate status: all done → completed; any started/done → in_progress; else todo. */
export function rollupTaskStatus(
  progress: TaskAssigneeProgress[]
): TaskStatus {
  if (progress.length === 0) return "todo";
  if (progress.every((row) => row.status === "completed")) return "completed";
  if (
    progress.some(
      (row) => row.status === "in_progress" || row.status === "completed"
    )
  ) {
    return "in_progress";
  }
  return "todo";
}

/** Latest completion timestamp when every assignee is done; otherwise null. */
export function rollupCompletedAt(
  progress: TaskAssigneeProgress[]
): string | null {
  if (progress.length === 0) return null;
  if (!progress.every((row) => row.status === "completed")) return null;
  let latest = "";
  for (const row of progress) {
    const stamp = row.completedAt ?? "";
    if (stamp > latest) latest = stamp;
  }
  return latest || new Date().toISOString();
}

export function taskAssigneeCompletionSummary(
  progress: TaskAssigneeProgress[] | undefined | null
): TaskAssigneeCompletionSummary {
  const rows = asProgressList(progress);
  const completedCount = rows.filter((row) => row.status === "completed").length;
  return {
    total: rows.length,
    completedCount,
    pendingCount: Math.max(0, rows.length - completedCount),
  };
}

/** Apply a status change for one assignee (evidence only when completing). */
export function applyAssigneeStatusChange(
  progress: TaskAssigneeProgress[],
  employeeId: string,
  status: TaskStatus,
  evidence?: {
    links?: string[];
    notes?: string;
    media?: TaskAssigneeProgress["evidenceMedia"];
  },
  nowIso = new Date().toISOString()
): TaskAssigneeProgress[] {
  return progress.map((row) => {
    if (row.employeeId !== employeeId) return row;
    const next: TaskAssigneeProgress = {
      ...row,
      status,
      completedAt: status === "completed" ? nowIso : null,
    };
    if (evidence?.links !== undefined) {
      next.evidenceLinks = evidence.links;
    }
    if (evidence?.notes !== undefined) {
      next.evidenceNotes = evidence.notes;
    }
    if (evidence?.media !== undefined) {
      next.evidenceMedia = evidence.media;
    }
    return next;
  });
}

/** Admin force: set every assignee to the same status. */
export function applyStatusToAllAssignees(
  progress: TaskAssigneeProgress[],
  status: TaskStatus,
  evidence?: {
    links?: string[];
    notes?: string;
    media?: TaskAssigneeProgress["evidenceMedia"];
  },
  nowIso = new Date().toISOString()
): TaskAssigneeProgress[] {
  return progress.map((row) => ({
    ...row,
    status,
    completedAt: status === "completed" ? nowIso : null,
    evidenceLinks:
      evidence?.links !== undefined ? evidence.links : row.evidenceLinks,
    evidenceNotes:
      evidence?.notes !== undefined ? evidence.notes : row.evidenceNotes,
    evidenceMedia:
      evidence?.media !== undefined ? evidence.media : row.evidenceMedia,
  }));
}

export function findAssigneeProgress(
  progress: TaskAssigneeProgress[] | undefined | null,
  employeeId: string
): TaskAssigneeProgress | undefined {
  return asProgressList(progress).find((row) => row.employeeId === employeeId);
}

/** Ensure progress exists and stays aligned with assigneeIds. */
export function ensureTaskAssigneeProgress<
  T extends Pick<
    WorkTask,
    | "assigneeIds"
    | "status"
    | "completedAt"
    | "evidenceLinks"
    | "evidenceNotes"
    | "evidenceMedia"
  > & { assigneeProgress?: TaskAssigneeProgress[] },
>(task: T): T & { assigneeProgress: TaskAssigneeProgress[] } {
  const assigneeProgress = syncAssigneeProgress(
    task.assigneeIds,
    task.assigneeProgress,
    {
      status: task.status,
      completedAt: task.completedAt,
      evidenceLinks: task.evidenceLinks,
      evidenceNotes: task.evidenceNotes,
      evidenceMedia: task.evidenceMedia,
    }
  );
  return { ...task, assigneeProgress };
}

/**
 * Employee view: expose their personal status/evidence while hiding co-assignees.
 * Aggregate fields stay on the raw record for admins.
 */
export function presentAssigneeProgressForEmployee<
  T extends Pick<
    WorkTask,
    | "assigneeIds"
    | "status"
    | "completedAt"
    | "evidenceLinks"
    | "evidenceNotes"
    | "evidenceMedia"
  > & { assigneeProgress?: TaskAssigneeProgress[] },
>(task: T, employeeId: string): T {
  if (!employeeId || !task.assigneeIds.includes(employeeId)) return task;
  const ensured = ensureTaskAssigneeProgress(task);
  const mine = findAssigneeProgress(ensured.assigneeProgress, employeeId);
  if (!mine) return ensured;
  return {
    ...ensured,
    assigneeIds: [employeeId],
    assigneeProgress: [mine],
    status: mine.status,
    completedAt: mine.completedAt ?? null,
    evidenceLinks: mine.evidenceLinks ?? [],
    evidenceNotes: mine.evidenceNotes ?? "",
    evidenceMedia: mine.evidenceMedia ?? [],
  };
}
