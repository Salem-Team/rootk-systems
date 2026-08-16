import { ForbiddenError } from "@/lib/errors";
import { hasPermissionId } from "@/constants/permissions";
import { AppRole } from "@/constants/roles";
import { localDirectReportIds } from "@/services/employee-scope";
import {
  getSessionPermissions,
  getSessionRole,
  getSessionUserId,
  getWorkEmployeeId,
} from "@/stores/session-store";
import { presentAssigneeProgressForEmployee } from "@/lib/task-assignee-progress";
import {
  employeeOwnsPersonalMeeting,
  employeeOwnsPersonalTask,
  isAssignedTo,
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
    assigneeProgress: [],
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

function canManageOthersWork(): boolean {
  const permissions = getSessionPermissions();
  const role = getSessionRole();
  return (
    hasPermissionId("tasks.editOthers", permissions, role) ||
    hasPermissionId("tasks.viewAll", permissions, role) ||
    hasPermissionId("tasks.assign", permissions, role)
  );
}

function canSeeTeamWork(): boolean {
  const permissions = getSessionPermissions();
  const role = getSessionRole();
  return (
    canManageOthersWork() ||
    hasPermissionId("tasks.viewTeam", permissions, role) ||
    hasPermissionId("tasks.editTeam", permissions, role)
  );
}

export type WorkTaskListScope = "all" | "managed" | "own";

/** Who the current actor may list besides tasks assigned to them. */
export function workTaskListScope(): WorkTaskListScope {
  const permissions = getSessionPermissions();
  const role = getSessionRole();
  if (role === AppRole.admin) return "all";
  if (hasPermissionId("tasks.viewAll", permissions, role)) return "all";
  if (hasPermissionId("team.viewAll", permissions, role)) return "all";
  if (
    hasPermissionId("tasks.viewTeam", permissions, role) ||
    hasPermissionId("tasks.assign", permissions, role)
  ) {
    return "managed";
  }
  return "own";
}

/** Hide co-assignees and overlay personal progress when viewer lacks company scope. */
export function presentWorkTaskForActor(task: WorkTask): WorkTask {
  const { role, employeeId } = actorContext();
  if (canSeeTeamWork() || role !== AppRole.employee || !employeeId) {
    return task;
  }
  return presentAssigneeProgressForEmployee(task, employeeId);
}

export function presentWorkTasksForActor(tasks: WorkTask[]): WorkTask[] {
  return tasks.map(presentWorkTaskForActor);
}

export async function assertEmployeeCanEditTask(task: WorkTask): Promise<void> {
  const { userId, employeeId } = actorContext();
  if (hasPermissionId("tasks.editOthers", getSessionPermissions(), getSessionRole())) {
    return;
  }
  if (
    hasPermissionId("tasks.editOwn", getSessionPermissions(), getSessionRole()) &&
    employeeOwnsPersonalTask(task, employeeId, userId)
  ) {
    return;
  }
  if (hasPermissionId("tasks.editTeam", getSessionPermissions(), getSessionRole())) {
    const reports = await localDirectReportIds();
    if (task.assigneeIds.some((id) => reports.includes(id))) return;
  }
  throw new ForbiddenError("You can only edit tasks in your team scope");
}

export function assertEmployeeCanEditMeeting(meeting: WorkMeeting): void {
  const { userId, employeeId } = actorContext();
  const permissions = getSessionPermissions();
  const role = getSessionRole();
  if (!hasPermissionId("tasks.manageMeetings", permissions, role)) {
    throw new ForbiddenError("You can only edit your personal meetings");
  }
  if (canManageOthersWork()) return;
  if (employeeOwnsPersonalMeeting(meeting, employeeId, userId)) return;
  throw new ForbiddenError("You can only edit your personal meetings");
}

export function assertEmployeeCanTouchTaskProgress(task: WorkTask): void {
  const { employeeId } = actorContext();
  if (canManageOthersWork()) return;
  if (isAssignedTo(task.assigneeIds, employeeId)) return;
  throw new ForbiddenError("You can only update tasks assigned to you");
}
