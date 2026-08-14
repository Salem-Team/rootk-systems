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
import {
  applyAssigneeStatusChange,
  applyStatusToAllAssignees,
  ensureTaskAssigneeProgress,
  findAssigneeProgress,
  rollupCompletedAt,
  rollupTaskStatus,
  syncAssigneeProgress,
} from "@/lib/task-assignee-progress";
import { assertEmployeeCanAssignToTeam } from "@/services/team-access";
import { AppRole } from "@/constants/roles";
import {
  actorContext,
  assertEmployeeCanEditTask,
  emptyTask,
  presentWorkTaskForActor,
} from "@/services/work/work-shared";
import type { ApiResponse } from "@/types";
import type { WorkTask } from "@/types/work";

/** POST /work/tasks */
export async function createWorkTask(
  input: CreateWorkTaskDto
): Promise<ApiResponse<WorkTask>> {
  const { role, userId, employeeId } = actorContext();
  const teamAssign =
    role === AppRole.employee &&
    input.origin === "assigned" &&
    (input.assigneeIds?.length ?? 0) > 0;
  const normalized =
    role === AppRole.employee && !teamAssign
      ? forcePersonalTaskPayload(input, employeeId)
      : input;

  if (isApiMode()) {
    const res = await postWorkTask(normalized);
    if (res.success) emitWorkUpdated();
    if (!res.success || !res.data) return res;
    return ok(presentWorkTaskForActor(res.data), res.message);
  }
  try {
    const parsed = createWorkTaskSchema.safeParse(normalized);
    if (!parsed.success) {
      throw new ValidationError("Invalid task payload", parsed.error.flatten());
    }
    if (teamAssign) {
      await assertEmployeeCanAssignToTeam(parsed.data.assigneeIds);
    }
    if (
      role === AppRole.employee &&
      parsed.data.origin !== "personal" &&
      !teamAssign
    ) {
      throw new ForbiddenError("Employees can only create personal tasks");
    }
    const actor = userId;
    const now = new Date().toISOString();
    const status = parsed.data.status ?? "todo";
    const evidenceLinks = (parsed.data.evidenceLinks ?? []).filter(
      isValidEvidenceUrl
    );
    const evidenceNotes = parsed.data.evidenceNotes ?? "";
    const assigneeProgress = syncAssigneeProgress(
      parsed.data.assigneeIds,
      [],
      {
        status,
        completedAt: status === "completed" ? now : null,
        evidenceLinks,
        evidenceNotes,
      }
    );
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
        assigneeProgress,
        relatedMeetingId: parsed.data.relatedMeetingId,
        origin: parsed.data.origin ?? "assigned",
        requireEvidenceLinks:
          role === AppRole.employee && !teamAssign
            ? false
            : Boolean(parsed.data.requireEvidenceLinks),
        requireEvidenceNotes:
          role === AppRole.employee && !teamAssign
            ? false
            : Boolean(parsed.data.requireEvidenceNotes),
        evidenceLinks,
        evidenceNotes,
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
    return ok(presentWorkTaskForActor(task), "Task created");
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
    if (!res.success || !res.data) return res;
    return ok(presentWorkTaskForActor(res.data), res.message);
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
      const ensured = ensureTaskAssigneeProgress(current);
      const mine = findAssigneeProgress(ensured.assigneeProgress, employeeId);
      const check = validateTaskEvidence(
        {
          requireEvidenceLinks: nextRequireLinks,
          requireEvidenceNotes: nextRequireNotes,
        },
        {
          links: parsed.data.evidenceLinks ?? mine?.evidenceLinks ?? current.evidenceLinks,
          notes: parsed.data.evidenceNotes ?? mine?.evidenceNotes ?? current.evidenceNotes,
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

    const nextAssigneeIds =
      role === AppRole.employee
        ? [employeeId]
        : (parsed.data.assigneeIds ?? current.assigneeIds);

    let progress = syncAssigneeProgress(
      nextAssigneeIds,
      ensureTaskAssigneeProgress(current).assigneeProgress,
      { status: "todo" }
    );

    const requestedStatus = parsed.data.status;
    if (requestedStatus && requestedStatus !== current.status) {
      const evidencePatch = {
        links:
          parsed.data.evidenceLinks !== undefined
            ? parsed.data.evidenceLinks.filter(isValidEvidenceUrl)
            : undefined,
        notes: parsed.data.evidenceNotes,
      };
      progress =
        role === AppRole.admin
          ? applyStatusToAllAssignees(progress, requestedStatus, evidencePatch)
          : applyAssigneeStatusChange(
              progress,
              employeeId,
              requestedStatus,
              evidencePatch
            );
    } else if (
      (parsed.data.evidenceLinks !== undefined ||
        parsed.data.evidenceNotes !== undefined) &&
      role === AppRole.employee
    ) {
      const mine = findAssigneeProgress(progress, employeeId);
      progress = applyAssigneeStatusChange(
        progress,
        employeeId,
        mine?.status ?? current.status,
        {
          links:
            parsed.data.evidenceLinks !== undefined
              ? parsed.data.evidenceLinks.filter(isValidEvidenceUrl)
              : undefined,
          notes: parsed.data.evidenceNotes,
        }
      );
    }

    const nextStatus = rollupTaskStatus(progress);
    const completedAt =
      parsed.data.completedAt !== undefined
        ? parsed.data.completedAt
        : rollupCompletedAt(progress);

    const primaryEvidence =
      findAssigneeProgress(progress, employeeId) ??
      progress.find((p) => p.status === "completed") ??
      progress[0];

    const next = touchEntity(current, actor, {
      ...parsed.data,
      origin: role === AppRole.employee ? "personal" : parsed.data.origin,
      assigneeIds: nextAssigneeIds,
      assigneeProgress: progress,
      status: nextStatus,
      requireEvidenceLinks: nextRequireLinks,
      requireEvidenceNotes: nextRequireNotes,
      evidenceLinks:
        parsed.data.evidenceLinks !== undefined
          ? parsed.data.evidenceLinks.filter(isValidEvidenceUrl)
          : (primaryEvidence?.evidenceLinks ?? current.evidenceLinks),
      evidenceNotes:
        parsed.data.evidenceNotes !== undefined
          ? parsed.data.evidenceNotes
          : (primaryEvidence?.evidenceNotes ?? current.evidenceNotes),
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
      nextStatus === "completed" &&
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
        fullyComplete: true,
      });
    }
    if (saved.targetId && nextStatus !== current.status) {
      const { recalculateTargetProgress } = await import(
        "@/services/targets.service"
      );
      void recalculateTargetProgress(saved.targetId);
    }
    return ok(presentWorkTaskForActor(saved), "Task updated");
  } catch (error) {
    return fromError(error, emptyTask(id));
  }
}
