import { toDateTimeLocalValue } from "@/lib/flexible-datetime";
import { todayIsoDate } from "@/lib/work-utils";
import type { TaskPriority, TaskStatus, WorkMeeting, WorkTask } from "@/types/work";

export type PanelTab = "tasks" | "meetings";
export type TaskFilter = "all" | TaskStatus | "overdue";
export type MeetingFilter = "all" | "today" | "upcoming" | "past";

export const PRIORITY_VARIANT = {
  high: "danger",
  medium: "warning",
  low: "info",
} as const;

export interface TaskFormState {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  tag: string;
  estimateMin: number;
  assigneeIds: string[];
  relatedMeetingId: string;
  subItemsText: string;
  requireEvidenceLinks: boolean;
  requireEvidenceNotes: boolean;
}

export interface MeetingFormState {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  organizerId: string;
  participantIds: string[];
  agendaText: string;
  notes: string;
  joinUrl: string;
}

export function emptyTaskForm(): TaskFormState {
  return {
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
    dueDate: "",
    tag: "",
    estimateMin: 0,
    assigneeIds: [],
    relatedMeetingId: "",
    subItemsText: "",
    requireEvidenceLinks: false,
    requireEvidenceNotes: false,
  };
}

export function emptyMeetingForm(organizerId: string): MeetingFormState {
  return {
    title: "",
    date: todayIsoDate(),
    startTime: "10:00",
    endTime: "11:00",
    location: "",
    organizerId,
    participantIds: organizerId ? [organizerId] : [],
    agendaText: "",
    notes: "",
    joinUrl: "",
  };
}

export function taskToForm(task: WorkTask): TaskFormState {
  return {
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: toDateTimeLocalValue(task.dueDate),
    tag: task.tag,
    estimateMin: task.estimateMin,
    assigneeIds: [...task.assigneeIds],
    relatedMeetingId: task.relatedMeetingId ?? "",
    subItemsText: task.subItems.map((s) => s.label).join("\n"),
    requireEvidenceLinks: Boolean(task.requireEvidenceLinks),
    requireEvidenceNotes: Boolean(task.requireEvidenceNotes),
  };
}

export function meetingToForm(meeting: WorkMeeting): MeetingFormState {
  return {
    title: meeting.title,
    date: meeting.date,
    startTime: meeting.startTime,
    endTime: meeting.endTime,
    location: meeting.location,
    organizerId: meeting.organizerId,
    participantIds: [...meeting.participantIds],
    agendaText: meeting.agenda.join("\n"),
    notes: meeting.notes,
    joinUrl: meeting.joinUrl ?? "",
  };
}
