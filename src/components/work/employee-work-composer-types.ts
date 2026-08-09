import { toDateTimeLocalValue } from "@/lib/flexible-datetime";
import { todayIsoDate } from "@/lib/work-utils";
import type { TaskPriority, WorkMeeting, WorkTask } from "@/types/work";

export type ComposerMode = "task" | "meeting" | null;

export interface TaskDraft {
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string;
  tag: string;
  estimateMin: number;
  subItemsText: string;
}

export interface MeetingDraft {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  participantIds: string[];
  agendaText: string;
  notes: string;
  joinUrl: string;
}

export function emptyTaskDraft(): TaskDraft {
  return {
    title: "",
    description: "",
    priority: "medium",
    dueDate: "",
    tag: "",
    estimateMin: 0,
    subItemsText: "",
  };
}

export function emptyMeetingDraft(selfId: string): MeetingDraft {
  return {
    title: "",
    date: todayIsoDate(),
    startTime: "10:00",
    endTime: "11:00",
    location: "",
    participantIds: [selfId],
    agendaText: "",
    notes: "",
    joinUrl: "",
  };
}

export function taskToDraft(task: WorkTask): TaskDraft {
  return {
    title: task.title,
    description: task.description,
    priority: task.priority,
    dueDate: toDateTimeLocalValue(task.dueDate),
    tag: task.tag,
    estimateMin: task.estimateMin,
    subItemsText: task.subItems.map((s) => s.label).join("\n"),
  };
}

export function meetingToDraft(meeting: WorkMeeting): MeetingDraft {
  return {
    title: meeting.title,
    date: meeting.date,
    startTime: meeting.startTime,
    endTime: meeting.endTime,
    location: meeting.location,
    participantIds: [...meeting.participantIds],
    agendaText: meeting.agenda.join("\n"),
    notes: meeting.notes,
    joinUrl: meeting.joinUrl ?? "",
  };
}
