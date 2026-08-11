import { isBefore, isSameDay, parseISO, startOfDay } from "date-fns";
import { demoNow, demoTodayKey } from "@/lib/mock-date";
import { tryParseFlexibleDateTime } from "@/lib/flexible-datetime";
import type {
  MeetingWhen,
  TaskDueBucket,
  WorkMeeting,
  WorkOrigin,
  WorkTask,
} from "@/types/work";

export function todayIsoDate(now = demoNow()): string {
  void now;
  return demoTodayKey();
}

export function taskDueBucket(
  dueDate: string,
  status: WorkTask["status"],
  now = demoNow()
): TaskDueBucket {
  if (!dueDate) return "none";
  if (status === "completed") return "upcoming";
  const due =
    tryParseFlexibleDateTime(
      dueDate,
      dueDate.length === 10 ? "end" : "exact"
    ) ?? startOfDay(parseISO(dueDate.slice(0, 10)));
  if (isBefore(due, now)) return "overdue";
  if (isSameDay(due, now)) return "today";
  return "upcoming";
}

export function meetingWhen(
  date: string,
  now = demoNow()
): MeetingWhen {
  const today = todayIsoDate(now);
  if (date === today) return "today";
  if (date < today) return "past";
  return "upcoming";
}

export function isAssignedTo(ids: string[], employeeId: string): boolean {
  return ids.includes(employeeId);
}

/** Employees only see themselves on a task — never co-assignees. */
export function scopeWorkTaskAssigneesForEmployee<
  T extends { assigneeIds: string[] },
>(task: T, employeeId: string): T {
  if (!employeeId || !isAssignedTo(task.assigneeIds, employeeId)) return task;
  if (task.assigneeIds.length === 1) return task;
  return { ...task, assigneeIds: [employeeId] };
}

export function filterTasksForEmployee(
  tasks: WorkTask[],
  employeeId: string
): WorkTask[] {
  return tasks.filter((t) => isAssignedTo(t.assigneeIds, employeeId));
}

export function filterMeetingsForEmployee(
  meetings: WorkMeeting[],
  employeeId: string
): WorkMeeting[] {
  return meetings.filter(
    (m) =>
      isAssignedTo(m.participantIds, employeeId) || m.organizerId === employeeId
  );
}

export function openTaskCount(tasks: WorkTask[]): number {
  return tasks.filter((t) => t.status === "todo" || t.status === "in_progress")
    .length;
}

export function resolveWorkOrigin(
  item: { origin?: WorkTask["origin"] | WorkMeeting["origin"] }
): NonNullable<WorkTask["origin"]> {
  return item.origin ?? "assigned";
}

export function isPersonalWork(item: {
  origin?: WorkTask["origin"] | WorkMeeting["origin"];
}): boolean {
  return resolveWorkOrigin(item) === "personal";
}

/** Whether the employee owns this personal task (assignee or creator). */
export function employeeOwnsPersonalTask(
  task: WorkTask,
  employeeId: string,
  actorUserId?: string
): boolean {
  if (!isPersonalWork(task)) return false;
  if (isAssignedTo(task.assigneeIds, employeeId)) return true;
  if (task.createdBy === employeeId) return true;
  if (actorUserId && task.createdBy === actorUserId) return true;
  return false;
}

/** Whether the employee owns this personal meeting (organizer or creator). */
export function employeeOwnsPersonalMeeting(
  meeting: WorkMeeting,
  employeeId: string,
  actorUserId?: string
): boolean {
  if (!isPersonalWork(meeting)) return false;
  if (meeting.organizerId === employeeId) return true;
  if (meeting.createdBy === employeeId) return true;
  if (actorUserId && meeting.createdBy === actorUserId) return true;
  return false;
}

export function forcePersonalTaskPayload<T extends {
  origin?: WorkOrigin;
  assigneeIds: string[];
}>(payload: T, employeeId: string): T {
  return {
    ...payload,
    origin: "personal",
    assigneeIds: [employeeId],
  };
}

export function forcePersonalMeetingPayload<T extends {
  origin?: WorkOrigin;
  organizerId: string;
  participantIds: string[];
}>(payload: T, employeeId: string): T {
  return {
    ...payload,
    origin: "personal",
    organizerId: employeeId,
    participantIds: Array.from(
      new Set([employeeId, ...payload.participantIds])
    ),
  };
}
