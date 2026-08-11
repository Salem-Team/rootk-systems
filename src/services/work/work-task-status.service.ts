import { touchEntity } from "@/lib/entity";
import { isApiMode } from "@/lib/env";
import { ValidationError, NotFoundError } from "@/lib/errors";
import {
  deleteWorkTaskRemote,
  patchWorkTaskStatus,
  patchWorkTaskSubItemToggle,
} from "@/api/work.api";
import { workTaskRepository } from "@/repositories/work.repository";
import {
  updateWorkTaskStatusSchema,
  type TaskEvidenceDto,
} from "@/schemas/work.schema";
import { isValidEvidenceUrl, validateTaskEvidence } from "@/lib/task-evidence";
import { fromError, ok } from "@/services/api-result";
import { getSessionRole, getSessionUserId } from "@/stores/session-store";
import { emitWorkUpdated } from "@/lib/events";
import { isPersonalWork } from "@/lib/work-utils";
import { AppRole } from "@/constants/roles";
import {
  assertEmployeeCanEditTask,
  assertEmployeeCanTouchTaskProgress,
  emptyTask,
  presentWorkTaskForActor,
} from "@/services/work/work-shared";
import { updateWorkTask } from "@/services/work/work-task-mutations.service";
import type { ApiResponse } from "@/types";
import type { TaskStatus, WorkTask } from "@/types/work";

/** PATCH /work/tasks/:id/status */
export async function updateWorkTaskStatus(
  id: string,
  status: TaskStatus,
  evidence?: TaskEvidenceDto
): Promise<ApiResponse<WorkTask>> {
  if (isApiMode()) {
    const res = await patchWorkTaskStatus(id, status, evidence);
    if (res.success) emitWorkUpdated();
    if (!res.success || !res.data) return res;
    return ok(presentWorkTaskForActor(res.data), res.message);
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
      getSessionRole() === AppRole.employee
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

    const completedAtPatch =
      parsed.data.status === "completed" && current.status !== "completed"
        ? { completedAt: new Date().toISOString() }
        : parsed.data.status !== "completed" && current.status === "completed"
          ? { completedAt: null }
          : {};

    if (isPersonalWork(current)) {
      return updateWorkTask(id, {
        status: parsed.data.status,
        evidenceLinks: parsed.data.evidence?.links,
        evidenceNotes: parsed.data.evidence?.notes,
        ...completedAtPatch,
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
      ...completedAtPatch,
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
    if (saved.targetId && parsed.data.status !== current.status) {
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

/** PATCH /work/tasks/:id/sub-items/:subId */
export async function toggleWorkTaskSubItem(
  id: string,
  subId: string
): Promise<ApiResponse<WorkTask>> {
  if (isApiMode()) {
    const res = await patchWorkTaskSubItemToggle(id, subId);
    if (res.success) emitWorkUpdated();
    if (!res.success || !res.data) return res;
    return ok(presentWorkTaskForActor(res.data), res.message);
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
    return ok(presentWorkTaskForActor(saved));
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
