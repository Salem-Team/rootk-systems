import type { BaseEntity } from "@/types";

export type TaskStatus = "todo" | "in_progress" | "completed";
export type TaskPriority = "high" | "medium" | "low";
export type TaskDueBucket = "today" | "overdue" | "upcoming" | "none";
/** Admin-assigned vs employee-created personal work. */
export type WorkOrigin = "assigned" | "personal";

export interface WorkTaskSubItem {
  id: string;
  label: string;
  done: boolean;
}

/** Per-assignee progress on a shared (multi-person) work task. */
export interface TaskAssigneeProgress {
  employeeId: string;
  status: TaskStatus;
  completedAt?: string | null;
  evidenceLinks?: string[];
  evidenceNotes?: string;
  evidenceMedia?: WorkTaskMediaItem[];
}

/** Work item for one or more employees (admin or personal). */
export interface WorkTask extends BaseEntity {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  /** ISO date YYYY-MM-DD — empty string when no due date. */
  dueDate: string;
  tag: string;
  /** Minutes estimate — 0 when unset. */
  estimateMin: number;
  /** Employee entity ids (e.g. emp-003) */
  assigneeIds: string[];
  /**
   * Independent completion state per assignee.
   * Aggregate `status` / `completedAt` roll up from this list.
   */
  assigneeProgress?: TaskAssigneeProgress[];
  relatedMeetingId?: string;
  /** When set, completing this task advances linked PerformanceTarget progress. */
  targetId?: string;
  subItems: WorkTaskSubItem[];
  /** Defaults to assigned when omitted (legacy seeds). */
  origin?: WorkOrigin;
  /** When true, assignee must submit at least one proof link to complete. */
  requireEvidenceLinks?: boolean;
  /** When true, assignee must write completion notes to complete. */
  requireEvidenceNotes?: boolean;
  /** When true, assignee must attach proof images/videos to complete. */
  requireEvidenceMedia?: boolean;
  /** Proof URLs submitted on completion (PR, doc, drive, etc.). */
  evidenceLinks?: string[];
  /** Written proof / handoff notes submitted on completion. */
  evidenceNotes?: string;
  /** Proof images/videos submitted on completion. */
  evidenceMedia?: WorkTaskMediaItem[];
  /** Brief images/videos attached to the task. */
  media?: WorkTaskMediaItem[];
  /** ISO timestamp when the task was assigned / became actionable. */
  assignedAt?: string;
  /** ISO timestamp when marked completed (null/undefined while open). */
  completedAt?: string | null;
  /** Set when this assignment lives inside a project phase. */
  projectId?: string;
  phaseId?: string;
}

export type WorkTaskMediaKind = "image" | "video";

export interface WorkTaskMediaItem {
  id: string;
  kind: WorkTaskMediaKind;
  mime: string;
  name: string;
  sizeBytes: number;
  url?: string;
}

/** Scheduled meeting with assigned participants. */
export interface WorkMeeting extends BaseEntity {
  id: string;
  title: string;
  /** ISO date YYYY-MM-DD */
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  organizerId: string;
  participantIds: string[];
  agenda: string[];
  notes: string;
  joinUrl?: string;
  /** Defaults to assigned when omitted (legacy seeds). */
  origin?: WorkOrigin;
}

export type MeetingWhen = "today" | "upcoming" | "past";


/** Text or voice note on a work task (replies nest one level). */
export interface WorkTaskComment extends BaseEntity {
  id: string;
  taskId: string;
  parentId: string | null;
  authorUserId: string;
  authorEmployeeId: string | null;
  authorName: string;
  body: string;
  voiceFileId?: string | null;
  voiceDurationMs?: number | null;
  voiceMime?: string | null;
  /** API path or local data URL for playback. */
  voiceUrl?: string | null;
}

export interface CreateWorkTaskCommentInput {
  body?: string;
  parentId?: string | null;
  voice?: {
    dataBase64: string;
    mime: string;
    durationMs: number;
  } | null;
}
