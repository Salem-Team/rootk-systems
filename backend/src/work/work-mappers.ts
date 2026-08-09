import { BadRequestException } from "@nestjs/common";
import {
  TaskStatus,
  WorkOrigin,
  type WorkMeeting,
  type WorkTask,
} from "@prisma/client";
import { auditFields, dateOnly, iso, isoOrNull } from "../common/mappers";

export type Actor = {
  userId: string;
  role: "admin" | "employee";
  employeeId: string;
};

export function normalizeEvidenceUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function isValidEvidenceUrl(url: string): boolean {
  const normalized = normalizeEvidenceUrl(url);
  if (!normalized) return false;
  try {
    const parsed = new URL(normalized);
    return /^https?:\/\//i.test(normalized) && parsed.hostname.includes(".");
  } catch {
    return false;
  }
}

export function sanitizeEvidenceLinks(links: unknown): string[] {
  if (!Array.isArray(links)) return [];
  return links
    .map((link) => normalizeEvidenceUrl(String(link ?? "")))
    .filter(isValidEvidenceUrl)
    .slice(0, 10);
}

/** Employees must always leave notes; links stay optional unless the admin requires them. */
export function assertCompletionEvidence(
  task: WorkTask,
  evidence: { links?: string[]; notes?: string } | undefined,
  actorRole: Actor["role"]
) {
  if (actorRole === "admin") return;
  const requireLinks = task.requireEvidenceLinks;
  const links = sanitizeEvidenceLinks(
    evidence?.links !== undefined ? evidence.links : task.evidenceLinks
  );
  const notes = String(
    evidence?.notes !== undefined
      ? evidence.notes
      : (task.evidenceNotes ?? "")
  ).trim();

  if (requireLinks && links.length === 0) {
    throw new BadRequestException(
      "Proof links are required before completing this task"
    );
  }
  if (notes.length < 3) {
    throw new BadRequestException(
      "Completion notes are required before completing this task"
    );
  }
}

/** Prisma patch for status transitions that stamp completedAt. */
export function completionTimestampPatch(
  nextStatus: TaskStatus | string | undefined,
  currentStatus: TaskStatus | string
): { completedAt: Date | null } | Record<string, never> {
  if (!nextStatus || nextStatus === currentStatus) return {};
  if (nextStatus === TaskStatus.completed) {
    return { completedAt: new Date() };
  }
  if (currentStatus === TaskStatus.completed) {
    return { completedAt: null };
  }
  return {};
}

export function mapTask(row: WorkTask) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    dueDate: row.dueDate ? iso(row.dueDate) : "",
    tag: row.tag,
    estimateMin: row.estimateMin,
    assigneeIds: row.assigneeIds,
    relatedMeetingId: row.relatedMeetingId ?? undefined,
    targetId: row.targetId ?? undefined,
    subItems: row.subItems ?? [],
    origin: row.origin,
    requireEvidenceLinks: row.requireEvidenceLinks,
    requireEvidenceNotes: row.requireEvidenceNotes,
    evidenceLinks: row.evidenceLinks ?? [],
    evidenceNotes: row.evidenceNotes ?? "",
    assignedAt: iso(row.assignedAt ?? row.createdAt),
    completedAt: isoOrNull(row.completedAt),
    ...auditFields(row),
  };
}

export function mapMeeting(row: WorkMeeting) {
  return {
    id: row.id,
    title: row.title,
    date: dateOnly(row.date),
    startTime: row.startTime,
    endTime: row.endTime,
    location: row.location,
    organizerId: row.organizerId,
    participantIds: row.participantIds,
    agenda: row.agenda,
    notes: row.notes,
    joinUrl: row.joinUrl ?? undefined,
    origin: row.origin,
    ...auditFields(row),
  };
}

export function isPersonal(origin: WorkOrigin | string | null | undefined) {
  return (origin ?? WorkOrigin.assigned) === WorkOrigin.personal;
}

export function ownsPersonalTask(task: WorkTask, actor: Actor) {
  if (!isPersonal(task.origin)) return false;
  if (task.assigneeIds.includes(actor.employeeId)) return true;
  if (task.createdBy === actor.employeeId || task.createdBy === actor.userId) {
    return true;
  }
  return false;
}

export function ownsPersonalMeeting(meeting: WorkMeeting, actor: Actor) {
  if (!isPersonal(meeting.origin)) return false;
  if (meeting.organizerId === actor.employeeId) return true;
  if (
    meeting.createdBy === actor.employeeId ||
    meeting.createdBy === actor.userId
  ) {
    return true;
  }
  return false;
}
