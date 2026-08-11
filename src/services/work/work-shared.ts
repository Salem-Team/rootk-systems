import { ForbiddenError } from "@/lib/errors";
import { AppRole } from "@/constants/roles";
import { getSessionRole, getSessionUserId, getWorkEmployeeId } from "@/stores/session-store";
import {
  employeeOwnsPersonalMeeting,
  employeeOwnsPersonalTask,
  isAssignedTo,
  scopeWorkTaskAssigneesForEmployee,
} from "@/lib/work-utils";
import type { UserRole } from "@/types";
import type { WorkMeeting, WorkTask } from "@/types/work";

/** Fallback task shape for `fromError` responses — never persisted. */
export function emptyTask(id: string): WorkTask {
  return {
    id,
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
    dueDate: "",
    tag: "",
    estimateMin: 30,
    assigneeIds: [],
    subItems: [],
    origin: "assigned",
    requireEvidenceLinks: false,
    requireEvidenceNotes: false,
    evidenceLinks: [],
    evidenceNotes: "",
    assignedAt: "",
    completedAt: null,
    companyId: "",
    createdAt: "",
    updatedAt: "",
    createdBy: "",
    updatedBy: "",
    deletedAt: null,
    isArchived: false,
    version: 0,
    metadata: {},
  };
}

/** Fallback meeting shape for `fromError` responses — never persisted. */
export function emptyMeeting(id: string): WorkMeeting {
  return {
    id,
    title: "",
    date: "",
    startTime: "",
    endTime: "",
    location: "",
    organizerId: "",
    participantIds: [],
    agenda: [],
    notes: "",
    companyId: "",
    createdAt: "",
    updatedAt: "",
    createdBy: "",
    updatedBy: "",
    deletedAt: null,
    isArchived: false,
    version: 0,
    metadata: {},
  };
}

export function actorContext(): {
  role: UserRole;
  userId: string;
  employeeId: string;
} {
  return {
    role: getSessionRole(),
    userId: getSessionUserId(),
    employeeId: getWorkEmployeeId(),
  };
}

/** Hide co-assignees when the signed-in viewer is an employee. */
export function presentWorkTaskForActor(task: WorkTask): WorkTask {
  const { role, employeeId } = actorContext();
  if (role !== AppRole.employee || !employeeId) return task;
  return scopeWorkTaskAssigneesForEmployee(task, employeeId);
}

export function presentWorkTasksForActor(tasks: WorkTask[]): WorkTask[] {
  return tasks.map(presentWorkTaskForActor);
}

export function assertEmployeeCanEditTask(task: WorkTask): void {
  const { role, userId, employeeId } = actorContext();
  if (role === AppRole.admin) return;
  if (employeeOwnsPersonalTask(task, employeeId, userId)) return;
  throw new ForbiddenError("You can only edit your personal tasks");
}

export function assertEmployeeCanEditMeeting(meeting: WorkMeeting): void {
  const { role, userId, employeeId } = actorContext();
  if (role === AppRole.admin) return;
  if (employeeOwnsPersonalMeeting(meeting, employeeId, userId)) return;
  throw new ForbiddenError("You can only edit your personal meetings");
}

export function assertEmployeeCanTouchTaskProgress(task: WorkTask): void {
  const { role, employeeId } = actorContext();
  if (role === AppRole.admin) return;
  if (isAssignedTo(task.assigneeIds, employeeId)) return;
  throw new ForbiddenError("You can only update tasks assigned to you");
}
