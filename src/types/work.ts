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
  relatedMeetingId?: string;
  subItems: WorkTaskSubItem[];
  /** Defaults to assigned when omitted (legacy seeds). */
  origin?: WorkOrigin;
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
