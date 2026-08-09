import { enrichWithAudit, touchEntity } from "@/lib/entity";
import { createId } from "@/lib/id";
import { isApiMode } from "@/lib/env";
import { ForbiddenError, ValidationError, NotFoundError } from "@/lib/errors";
import { patchWorkTask, postWorkTask } from "@/api/work.api";
import { workTaskRepository } from "@/repositories/work.repository";
import {
  createWorkTaskSchema,
  updateWorkTaskSchema,
  type CreateWorkTaskDto,
  type UpdateWorkTaskDto,
} from "@/schemas/work.schema";
import { isValidEvidenceUrl, validateTaskEvidence } from "@/lib/task-evidence";
import { fromError, ok } from "@/services/api-result";
import { emitWorkUpdated } from "@/lib/events";
import { forcePersonalTaskPayload, isPersonalWork } from "@/lib/work-utils";
import { AppRole } from "@/constants/roles";
import {
  actorContext,
  assertEmployeeCanEditTask,
  emptyTask,
} from "@/services/work/work-shared";
import type { ApiResponse } from "@/types";
import type { WorkTask } from "@/types/work";

/** POST /work/tasks */
export async function createWorkTask(
  input: CreateWorkTaskDto
): Promise<ApiResponse<WorkTask>> {
  const { role, userId, employeeId } = actorContext();
  const normalized =
    role === AppRole.employee
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
    if (role === AppRole.employee && parsed.data.origin !== "personal") {
      throw new ForbiddenError("Employees can only create personal tasks");
    }
    const actor = userId;
    const now = new Date().toISOString();
    const status = parsed.data.status ?? "todo";
    const task = enrichWithAudit(
      {
        id: createId("task"),
        title: parsed.data.title,
        description: parsed.data.description ?? "",
        status,
        priority: parsed.data.priority ?? "medium",
        dueDate: parsed.data.dueDate ?? "",
        tag: parsed.data.tag ?? "",
        estimateMin: parsed.data.estimateMin ?? 0,
        assigneeIds: parsed.data.assigneeIds,
        relatedMeetingId: parsed.data.relatedMeetingId,
        origin: parsed.data.origin ?? "assigned",
        requireEvidenceLinks:
          role === AppRole.employee
            ? false
            : Boolean(parsed.data.requireEvidenceLinks),
        requireEvidenceNotes:
          role === AppRole.employee
            ? false
            : Boolean(parsed.data.requireEvidenceNotes),
        evidenceLinks: (parsed.data.evidenceLinks ?? []).filter(
          isValidEvidenceUrl
        ),
        evidenceNotes: parsed.data.evidenceNotes ?? "",
        assignedAt: now,
        completedAt: status === "completed" ? now : null,
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
  if (role === AppRole.employee) {
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
      role === AppRole.employee
        ? false
        : parsed.data.requireEvidenceLinks !== undefined
          ? parsed.data.requireEvidenceLinks
          : current.requireEvidenceLinks;
    const nextRequireNotes =
      role === AppRole.employee
        ? false
        : parsed.data.requireEvidenceNotes !== undefined
          ? parsed.data.requireEvidenceNotes
          : current.requireEvidenceNotes;

    if (
      parsed.data.status === "completed" &&
      current.status !== "completed" &&
      role === AppRole.employee
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

    const nextStatus = parsed.data.status ?? current.status;
    const completedAt =
      parsed.data.completedAt !== undefined
        ? parsed.data.completedAt
        : nextStatus === "completed" && current.status !== "completed"
          ? new Date().toISOString()
          : nextStatus !== "completed" && current.status === "completed"
            ? null
            : current.completedAt;

    const next = touchEntity(current, actor, {
      ...parsed.data,
      origin: role === AppRole.employee ? "personal" : parsed.data.origin,
      assigneeIds:
        role === AppRole.employee
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
      assignedAt: current.assignedAt || current.createdAt,
      completedAt,
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
    if (saved.targetId && parsed.data.status && parsed.data.status !== current.status) {
      const { recalculateTargetProgress } = await import(
        "@/services/targets.service"
      );
      void recalculateTargetProgress(saved.targetId);
    }
    return ok(saved, "Task updated");
  } catch (error) {
    return fromError(error, emptyTask(id));
  }
}
