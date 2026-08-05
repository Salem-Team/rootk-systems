import { enrichWithAudit, touchEntity } from "@/lib/entity";
import { createId } from "@/lib/id";
import { isApiMode } from "@/lib/env";
import { ForbiddenError, ValidationError, NotFoundError } from "@/lib/errors";
import {
  deleteWorkMeetingRemote,
  deleteWorkTaskRemote,
  fetchWorkMeetings,
  fetchWorkTaskById,
  fetchWorkTasks,
  patchWorkMeeting,
  patchWorkTask,
  patchWorkTaskStatus,
  patchWorkTaskSubItemToggle,
  postWorkMeeting,
  postWorkTask,
} from "@/api/work.api";
import {
  workMeetingRepository,
  workTaskRepository,
} from "@/repositories/work.repository";
import {
  createWorkMeetingSchema,
  createWorkTaskSchema,
  updateWorkMeetingSchema,
  updateWorkTaskSchema,
  updateWorkTaskStatusSchema,
  type CreateWorkMeetingDto,
  type CreateWorkTaskDto,
  type TaskEvidenceDto,
  type UpdateWorkMeetingDto,
  type UpdateWorkTaskDto,
} from "@/schemas/work.schema";
import {
  isValidEvidenceUrl,
  taskRequiresEvidence,
  validateTaskEvidence,
} from "@/lib/task-evidence";
import { fail, fromError, ok } from "@/services/api-result";
import {
  getSessionRole,
  getSessionUserId,
  getWorkEmployeeId,
} from "@/stores/session-store";
import { emitWorkUpdated } from "@/lib/events";
import {
  employeeOwnsPersonalMeeting,
  employeeOwnsPersonalTask,
  forcePersonalMeetingPayload,
  forcePersonalTaskPayload,
  isAssignedTo,
  isPersonalWork,
} from "@/lib/work-utils";
import type { ApiResponse, UserRole } from "@/types";
import type { TaskStatus, WorkMeeting, WorkTask } from "@/types/work";

export type { CreateWorkMeetingDto, CreateWorkTaskDto, UpdateWorkMeetingDto, UpdateWorkTaskDto };

function emptyTask(id: string): WorkTask {
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

function emptyMeeting(id: string): WorkMeeting {
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

function actorContext(): {
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

function assertEmployeeCanEditTask(task: WorkTask): void {
  const { role, userId, employeeId } = actorContext();
  if (role === "admin") return;
  if (employeeOwnsPersonalTask(task, employeeId, userId)) return;
  throw new ForbiddenError("You can only edit your personal tasks");
}

function assertEmployeeCanEditMeeting(meeting: WorkMeeting): void {
  const { role, userId, employeeId } = actorContext();
  if (role === "admin") return;
  if (employeeOwnsPersonalMeeting(meeting, employeeId, userId)) return;
  throw new ForbiddenError("You can only edit your personal meetings");
}

function assertEmployeeCanTouchTaskProgress(task: WorkTask): void {
  const { role, employeeId } = actorContext();
  if (role === "admin") return;
  if (isAssignedTo(task.assigneeIds, employeeId)) return;
  throw new ForbiddenError("You can only update tasks assigned to you");
}

/** GET /work/tasks */
export async function getWorkTasks(filters: {
  employeeId?: string;
  status?: TaskStatus;
} = {}): Promise<ApiResponse<WorkTask[]>> {
  const { role, employeeId: selfId } = actorContext();
  const scoped =
    role === "employee"
      ? { ...filters, employeeId: selfId }
      : filters;
  if (isApiMode()) return fetchWorkTasks(scoped);
  try {
    return ok(await workTaskRepository.filter(scoped));
  } catch (error) {
    return fromError(error, []);
  }
}

/** GET /work/tasks/:id */
export async function getWorkTaskById(
  id: string
): Promise<ApiResponse<WorkTask | null>> {
  if (isApiMode()) return fetchWorkTaskById(id);
  try {
    const task = await workTaskRepository.findById(id);
    if (!task) return fail(null, "Task not found", "NOT_FOUND");
    const { role, employeeId } = actorContext();
    if (role === "employee" && !isAssignedTo(task.assigneeIds, employeeId)) {
      return fail(null, "Task not found", "NOT_FOUND");
    }
    return ok(task);
  } catch (error) {
    return fromError(error, null);
  }
}

/** GET /work/tasks?mine=1 */
export async function getMyWorkTasks(
  employeeId = getWorkEmployeeId()
): Promise<ApiResponse<WorkTask[]>> {
  return getWorkTasks({ employeeId });
}

/** POST /work/tasks */
export async function createWorkTask(
  input: CreateWorkTaskDto
): Promise<ApiResponse<WorkTask>> {
  const { role, userId, employeeId } = actorContext();
  const normalized =
    role === "employee"
      ? forcePersonalTaskPayload(input, employeeId)
      : input;

  if (isApiMode()) {
    const res = await postWorkTask(normalized);
    if (res.success) emitWorkUpdated();
    return res;
  }
  try {
    const parsed = createWorkTaskSchema.safeParse(normalized);
    if (!parsed.success) {
      throw new ValidationError("Invalid task payload", parsed.error.flatten());
    }
    if (role === "employee" && parsed.data.origin !== "personal") {
      throw new ForbiddenError("Employees can only create personal tasks");
    }
    const actor = userId;
    const task = enrichWithAudit(
      {
        id: createId("task"),
        title: parsed.data.title,
        description: parsed.data.description ?? "",
        status: parsed.data.status ?? "todo",
        priority: parsed.data.priority ?? "medium",
        dueDate: parsed.data.dueDate ?? "",
        tag: parsed.data.tag ?? "",
        estimateMin: parsed.data.estimateMin ?? 0,
        assigneeIds: parsed.data.assigneeIds,
        relatedMeetingId: parsed.data.relatedMeetingId,
        origin: parsed.data.origin ?? "assigned",
        requireEvidenceLinks:
          role === "employee"
            ? false
            : Boolean(parsed.data.requireEvidenceLinks),
        requireEvidenceNotes:
          role === "employee"
            ? false
            : Boolean(parsed.data.requireEvidenceNotes),
        evidenceLinks: (parsed.data.evidenceLinks ?? []).filter(
          isValidEvidenceUrl
        ),
        evidenceNotes: parsed.data.evidenceNotes ?? "",
        subItems: (parsed.data.subItems ?? []).map((s) => ({
          id: s.id ?? createId("sub"),
          label: s.label,
          done: s.done ?? false,
        })),
      } satisfies Omit<WorkTask, keyof import("@/types").BaseEntity>,
      actor
    );
    await workTaskRepository.create(task);
    emitWorkUpdated();
    const { notifyTaskAssigned } = await import(
      "@/services/notification.service"
    );
    void notifyTaskAssigned({
      taskId: task.id,
      title: task.title,
      assigneeIds: task.assigneeIds,
      actorId: actor,
      origin: task.origin,
    });
    return ok(task, "Task created");
  } catch (error) {
    return fromError(error, emptyTask(""));
  }
}

/** PATCH /work/tasks/:id */
export async function updateWorkTask(
  id: string,
  input: UpdateWorkTaskDto
): Promise<ApiResponse<WorkTask>> {
  const { role, userId, employeeId } = actorContext();
  let payload = input;
  if (role === "employee") {
    payload = {
      ...input,
      origin: "personal",
      assigneeIds: input.assigneeIds ? [employeeId] : undefined,
    };
  }

  if (isApiMode()) {
    const res = await patchWorkTask(id, payload);
    if (res.success) emitWorkUpdated();
    return res;
  }
  try {
    const parsed = updateWorkTaskSchema.safeParse(payload);
    if (!parsed.success) {
      throw new ValidationError("Invalid task payload", parsed.error.flatten());
    }
    const current = await workTaskRepository.findById(id);
    if (!current) throw new NotFoundError("Task not found");
    assertEmployeeCanEditTask(current);
    const actor = userId;
    const nextRequireLinks =
      role === "employee"
        ? false
        : parsed.data.requireEvidenceLinks !== undefined
          ? parsed.data.requireEvidenceLinks
          : current.requireEvidenceLinks;
    const nextRequireNotes =
      role === "employee"
        ? false
        : parsed.data.requireEvidenceNotes !== undefined
          ? parsed.data.requireEvidenceNotes
          : current.requireEvidenceNotes;

    if (
      parsed.data.status === "completed" &&
      current.status !== "completed" &&
      role === "employee"
    ) {
      const check = validateTaskEvidence(
        {
          requireEvidenceLinks: nextRequireLinks,
          requireEvidenceNotes: nextRequireNotes,
        },
        {
          links: parsed.data.evidenceLinks ?? current.evidenceLinks,
          notes: parsed.data.evidenceNotes ?? current.evidenceNotes,
        }
      );
      if (!check.ok) {
        throw new ValidationError(
          check.code === "notes"
            ? "Completion notes are required"
            : check.code === "links"
              ? "Proof links are required"
              : "Proof links and notes are required"
        );
      }
    }

    const next = touchEntity(current, actor, {
      ...parsed.data,
      origin: role === "employee" ? "personal" : parsed.data.origin,
      assigneeIds:
        role === "employee"
          ? [employeeId]
          : (parsed.data.assigneeIds ?? current.assigneeIds),
      requireEvidenceLinks: nextRequireLinks,
      requireEvidenceNotes: nextRequireNotes,
      evidenceLinks:
        parsed.data.evidenceLinks !== undefined
          ? parsed.data.evidenceLinks.filter(isValidEvidenceUrl)
          : current.evidenceLinks,
      evidenceNotes:
        parsed.data.evidenceNotes !== undefined
          ? parsed.data.evidenceNotes
          : current.evidenceNotes,
      subItems: parsed.data.subItems
        ? parsed.data.subItems.map((s, i) => ({
            id: s.id ?? current.subItems[i]?.id ?? createId("sub"),
            label: s.label,
            done: s.done ?? false,
          }))
        : current.subItems,
    });
    const saved = await workTaskRepository.update(id, next);
    if (!saved) throw new NotFoundError("Task not found");
    emitWorkUpdated();
    if (
      parsed.data.status === "completed" &&
      current.status !== "completed" &&
      !isPersonalWork(saved)
    ) {
      const { notifyTaskCompleted } = await import(
        "@/services/notification.service"
      );
      void notifyTaskCompleted({
        taskId: saved.id,
        title: saved.title,
        actorId: actor,
      });
    }
    return ok(saved, "Task updated");
  } catch (error) {
    return fromError(error, emptyTask(id));
  }
}

/** PATCH /work/tasks/:id/status */
export async function updateWorkTaskStatus(
  id: string,
  status: TaskStatus,
  evidence?: TaskEvidenceDto
): Promise<ApiResponse<WorkTask>> {
  if (isApiMode()) {
    const res = await patchWorkTaskStatus(id, status, evidence);
    if (res.success) emitWorkUpdated();
    return res;
  }
  try {
    const parsed = updateWorkTaskStatusSchema.safeParse({ status, evidence });
    if (!parsed.success) {
      throw new ValidationError("Invalid status payload", parsed.error.flatten());
    }
    const current = await workTaskRepository.findById(id);
    if (!current) throw new NotFoundError("Task not found");
    assertEmployeeCanTouchTaskProgress(current);

    if (
      parsed.data.status === "completed" &&
      current.status !== "completed" &&
      getSessionRole() === "employee" &&
      taskRequiresEvidence(current)
    ) {
      const check = validateTaskEvidence(current, {
        links: parsed.data.evidence?.links ?? current.evidenceLinks,
        notes: parsed.data.evidence?.notes ?? current.evidenceNotes,
      });
      if (!check.ok) {
        throw new ValidationError(
          check.code === "notes"
            ? "Completion notes are required"
            : check.code === "links"
              ? "Proof links are required"
              : "Proof links and notes are required"
        );
      }
    }

    if (isPersonalWork(current)) {
      return updateWorkTask(id, {
        status: parsed.data.status,
        evidenceLinks: parsed.data.evidence?.links,
        evidenceNotes: parsed.data.evidence?.notes,
      });
    }
    const actor = getSessionUserId();
    const next = touchEntity(current, actor, {
      status: parsed.data.status,
      ...(parsed.data.evidence?.links !== undefined
        ? {
            evidenceLinks: parsed.data.evidence.links.filter(isValidEvidenceUrl),
          }
        : {}),
      ...(parsed.data.evidence?.notes !== undefined
        ? { evidenceNotes: parsed.data.evidence.notes }
        : {}),
    });
    const saved = await workTaskRepository.update(id, next);
    if (!saved) throw new NotFoundError("Task not found");
    emitWorkUpdated();
    if (
      parsed.data.status === "completed" &&
      current.status !== "completed"
    ) {
      const { notifyTaskCompleted } = await import(
        "@/services/notification.service"
      );
      void notifyTaskCompleted({
        taskId: saved.id,
        title: saved.title,
        actorId: actor,
      });
    }
    return ok(saved, "Task updated");
  } catch (error) {
    return fromError(error, emptyTask(id));
  }
}

/** PATCH /work/tasks/:id/sub-items/:subId */
export async function toggleWorkTaskSubItem(
  id: string,
  subId: string
): Promise<ApiResponse<WorkTask>> {
  if (isApiMode()) {
    const res = await patchWorkTaskSubItemToggle(id, subId);
    if (res.success) emitWorkUpdated();
    return res;
  }
  try {
    const current = await workTaskRepository.findById(id);
    if (!current) throw new NotFoundError("Task not found");
    assertEmployeeCanTouchTaskProgress(current);
    const actor = getSessionUserId();
    const next = touchEntity(current, actor, {
      subItems: current.subItems.map((s) =>
        s.id === subId ? { ...s, done: !s.done } : s
      ),
    });
    const saved = await workTaskRepository.update(id, next);
    if (!saved) throw new NotFoundError("Task not found");
    emitWorkUpdated();
    return ok(saved);
  } catch (error) {
    return fromError(error, emptyTask(id));
  }
}

/** DELETE /work/tasks/:id */
export async function deleteWorkTask(
  id: string
): Promise<ApiResponse<boolean>> {
  if (isApiMode()) {
    const res = await deleteWorkTaskRemote(id);
    if (res.success) emitWorkUpdated();
    return res;
  }
  try {
    const current = await workTaskRepository.findById(id);
    if (!current) throw new NotFoundError("Task not found");
    assertEmployeeCanEditTask(current);
    const deleted = await workTaskRepository.delete(id);
    if (!deleted) throw new NotFoundError("Task not found");
    emitWorkUpdated();
    return ok(true, "Task deleted");
  } catch (error) {
    return fromError(error, false);
  }
}

/** GET /work/meetings */
export async function getWorkMeetings(filters: {
  employeeId?: string;
  date?: string;
} = {}): Promise<ApiResponse<WorkMeeting[]>> {
  const { role, employeeId: selfId } = actorContext();
  const scoped =
    role === "employee"
      ? { ...filters, employeeId: selfId }
      : filters;
  if (isApiMode()) return fetchWorkMeetings(scoped);
  try {
    return ok(await workMeetingRepository.filter(scoped));
  } catch (error) {
    return fromError(error, []);
  }
}

/** GET /work/meetings?mine=1 */
export async function getMyWorkMeetings(
  employeeId = getWorkEmployeeId()
): Promise<ApiResponse<WorkMeeting[]>> {
  return getWorkMeetings({ employeeId });
}

/** POST /work/meetings */
export async function createWorkMeeting(
  input: CreateWorkMeetingDto
): Promise<ApiResponse<WorkMeeting>> {
  const { role, userId, employeeId } = actorContext();
  const normalized =
    role === "employee"
      ? forcePersonalMeetingPayload(input, employeeId)
      : input;

  if (isApiMode()) {
    const res = await postWorkMeeting(normalized);
    if (res.success) emitWorkUpdated();
    return res;
  }
  try {
    const parsed = createWorkMeetingSchema.safeParse(normalized);
    if (!parsed.success) {
      throw new ValidationError(
        "Invalid meeting payload",
        parsed.error.flatten()
      );
    }
    if (role === "employee" && parsed.data.origin !== "personal") {
      throw new ForbiddenError("Employees can only create personal meetings");
    }
    const actor = userId;
    const data = parsed.data;
    const participantIds = Array.from(
      new Set([data.organizerId, ...data.participantIds])
    );
    const meeting = enrichWithAudit(
      {
        id: createId("meet"),
        title: data.title,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        location: data.location,
        organizerId: data.organizerId,
        participantIds,
        agenda: data.agenda ?? [],
        notes: data.notes ?? "",
        joinUrl: data.joinUrl || undefined,
        origin: data.origin ?? "assigned",
      } satisfies Omit<WorkMeeting, keyof import("@/types").BaseEntity>,
      actor
    );
    await workMeetingRepository.create(meeting);
    emitWorkUpdated();
    const { notifyMeetingScheduled } = await import(
      "@/services/notification.service"
    );
    void notifyMeetingScheduled({
      meetingId: meeting.id,
      title: meeting.title,
      participantIds: meeting.participantIds,
      actorId: actor,
      origin: meeting.origin,
    });
    return ok(meeting, "Meeting created");
  } catch (error) {
    return fromError(error, emptyMeeting(""));
  }
}

/** PATCH /work/meetings/:id */
export async function updateWorkMeeting(
  id: string,
  input: UpdateWorkMeetingDto
): Promise<ApiResponse<WorkMeeting>> {
  const { role, userId, employeeId } = actorContext();
  const payload: UpdateWorkMeetingDto =
    role === "employee"
      ? {
          ...input,
          origin: "personal",
          organizerId: employeeId,
          participantIds: Array.from(
            new Set([
              employeeId,
              ...(input.participantIds ?? []),
            ])
          ),
        }
      : input;

  if (isApiMode()) {
    const res = await patchWorkMeeting(id, payload);
    if (res.success) emitWorkUpdated();
    return res;
  }
  try {
    const parsed = updateWorkMeetingSchema.safeParse(payload);
    if (!parsed.success) {
      throw new ValidationError(
        "Invalid meeting payload",
        parsed.error.flatten()
      );
    }
    const current = await workMeetingRepository.findById(id);
    if (!current) throw new NotFoundError("Meeting not found");
    assertEmployeeCanEditMeeting(current);
    const actor = userId;
    const patch = { ...parsed.data };
    if (patch.joinUrl === "") patch.joinUrl = undefined;
    if (role === "employee") {
      patch.origin = "personal";
      patch.organizerId = employeeId;
      const participants = patch.participantIds ?? current.participantIds;
      patch.participantIds = Array.from(new Set([employeeId, ...participants]));
    } else if (patch.organizerId || patch.participantIds) {
      const organizerId = patch.organizerId ?? current.organizerId;
      const participants = patch.participantIds ?? current.participantIds;
      patch.participantIds = Array.from(new Set([organizerId, ...participants]));
      patch.organizerId = organizerId;
    }
    const next = touchEntity(current, actor, patch);
    const saved = await workMeetingRepository.update(id, next);
    if (!saved) throw new NotFoundError("Meeting not found");
    emitWorkUpdated();
    return ok(saved, "Meeting updated");
  } catch (error) {
    return fromError(error, emptyMeeting(id));
  }
}

/** DELETE /work/meetings/:id */
export async function deleteWorkMeeting(
  id: string
): Promise<ApiResponse<boolean>> {
  if (isApiMode()) {
    const res = await deleteWorkMeetingRemote(id);
    if (res.success) emitWorkUpdated();
    return res;
  }
  try {
    const current = await workMeetingRepository.findById(id);
    if (!current) throw new NotFoundError("Meeting not found");
    assertEmployeeCanEditMeeting(current);
    const deleted = await workMeetingRepository.delete(id);
    if (!deleted) throw new NotFoundError("Meeting not found");
    emitWorkUpdated();
    return ok(true, "Meeting deleted");
  } catch (error) {
    return fromError(error, false);
  }
}
