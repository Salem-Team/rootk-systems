import {
  deleteTarget as apiDeleteTarget,
  patchTarget,
} from "@/api/targets.api";
import { isApiMode } from "@/lib/env";
import { touchEntity } from "@/lib/entity";
import { NotFoundError } from "@/lib/errors";
import { emitTargetsUpdated } from "@/lib/events";
import { computeTargetProgress } from "@/lib/target-progress";
import {
  performanceTargetRepository,
  workTaskRepository,
} from "@/repositories";
import type { AssignTargetInput } from "@/schemas/targets.schema";
import { fromError, ok } from "@/services/api-result";
import { getSessionUserId } from "@/stores/session-store";
import type { ApiResponse, PerformanceTarget } from "@/types";
import { assertCap, notifyQuietly, withMetrics, writeHistory } from "./targets-shared";

/** Recalculate target from linked WorkTasks — call after task completion. */
export async function recalculateTargetProgress(
  targetId: string
): Promise<PerformanceTarget | null> {
  if (isApiMode()) return null;
  const target = await performanceTargetRepository.findById(targetId);
  if (!target) return null;

  const tasks = await workTaskRepository.findAll();
  const linked = tasks.filter((t) => t.targetId === targetId);
  const completedQuantity = linked.filter((t) => t.status === "completed").length;
  const metrics = computeTargetProgress({
    quantity: target.quantity,
    completedQuantity,
    startDate: target.startDate,
    endDate: target.endDate,
    status: target.status,
  });

  const next = touchEntity(target, getSessionUserId(), {
    completedQuantity,
    status: metrics.derivedStatus,
    health: metrics.health,
    riskLevel: metrics.riskLevel,
    performanceScore: metrics.performanceScore,
  });
  await performanceTargetRepository.update(targetId, next);
  await writeHistory(targetId, "progress", {
    completedQuantity,
    percentage: metrics.percentage,
  });
  emitTargetsUpdated();

  if (completedQuantity !== target.completedQuantity) {
    await notifyQuietly(async () => {
      const { notifyTargetProgress } = await import(
        "@/services/notification.service"
      );
      await notifyTargetProgress(next, metrics.percentage);
    });
  }

  return withMetrics(next);
}

export async function updateTarget(
  id: string,
  input: Partial<AssignTargetInput>
): Promise<ApiResponse<PerformanceTarget>> {
  if (isApiMode()) return patchTarget(id, input);
  try {
    assertCap("edit");
    const current = await performanceTargetRepository.findById(id);
    if (!current) throw new NotFoundError("Target not found");
    const next = touchEntity(current, getSessionUserId(), {
      title: input.title ?? current.title,
      description: input.description ?? current.description,
      priority: input.priority ?? current.priority,
      weight: input.weight ?? current.weight,
      notes: input.notes ?? current.notes,
      endDate: input.endDate ?? current.endDate,
      startDate: input.startDate ?? current.startDate,
      status: input.status ?? current.status,
      assigneeIds: input.assigneeIds ?? current.assigneeIds,
      department: input.department ?? current.department,
      branch: input.branch ?? current.branch,
    });
    await performanceTargetRepository.update(id, next);
    await writeHistory(id, "updated", input as Record<string, unknown>);
    emitTargetsUpdated();
    return ok(withMetrics(next));
  } catch (error) {
    return fromError(error, {
      id,
      title: "",
      description: "",
      categoryId: "",
      typeId: "",
      templateId: null,
      quantity: 0,
      unit: "unit",
      completedQuantity: 0,
      startDate: "",
      endDate: "",
      priority: "medium",
      weight: 1,
      assigneeScope: "employee",
      assigneeIds: [],
      department: "",
      branch: "",
      roleKey: "",
      ownerId: "",
      status: "draft",
      health: "average",
      riskLevel: "low",
      notes: "",
      expectedCompletion: null,
      performanceScore: 0,
      companyId: "",
      createdAt: "",
      updatedAt: "",
      createdBy: "",
      updatedBy: "",
      deletedAt: null,
      isArchived: false,
      version: 0,
      metadata: {},
    });
  }
}

export async function removeTarget(
  id: string
): Promise<ApiResponse<{ ok: boolean }>> {
  if (isApiMode()) return apiDeleteTarget(id);
  try {
    assertCap("delete");
    await performanceTargetRepository.delete(id);
    emitTargetsUpdated();
    return ok({ ok: true });
  } catch (error) {
    return fromError(error, { ok: false });
  }
}
