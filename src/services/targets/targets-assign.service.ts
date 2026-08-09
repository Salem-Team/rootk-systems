import { postTarget } from "@/api/targets.api";
import { isApiMode } from "@/lib/env";
import { enrichWithAudit } from "@/lib/entity";
import { ValidationError } from "@/lib/errors";
import { createId } from "@/lib/id";
import { emitTargetsUpdated } from "@/lib/events";
import {
  buildTaskTitle,
  computeTargetProgress,
  MAX_AUTO_TASKS_PER_TARGET,
} from "@/lib/target-progress";
import {
  performanceTargetRepository,
  targetCategoryRepository,
  targetTypeRepository,
  workTaskRepository,
} from "@/repositories";
import {
  assignTargetSchema,
  type AssignTargetInput,
} from "@/schemas/targets.schema";
import { fromError, ok } from "@/services/api-result";
import { getSessionUserId } from "@/stores/session-store";
import type { ApiResponse, PerformanceTarget, TargetType, WorkTask } from "@/types";
import { assertCap, notifyQuietly, withMetrics, writeHistory } from "./targets-shared";

async function generateTasksForTarget(
  target: PerformanceTarget,
  type: TargetType
): Promise<void> {
  const actorId = getSessionUserId();
  const count = Math.min(target.quantity, MAX_AUTO_TASKS_PER_TARGET);
  for (let i = 1; i <= count; i++) {
    const task: WorkTask = enrichWithAudit(
      {
        id: createId("task"),
        title: buildTaskTitle(type.taskTitleTemplate, type.name, i),
        description:
          target.description || `Auto task for target: ${target.title}`,
        status: "todo",
        priority:
          target.priority === "critical" || target.priority === "high"
            ? "high"
            : target.priority === "low"
              ? "low"
              : "medium",
        dueDate: target.endDate,
        tag: type.name,
        estimateMin: 0,
        assigneeIds: target.assigneeIds,
        targetId: target.id,
        subItems: [],
        origin: "assigned",
      },
      actorId
    );
    await workTaskRepository.create(task);
  }
}

export async function assignTarget(
  input: AssignTargetInput
): Promise<ApiResponse<PerformanceTarget>> {
  if (isApiMode()) return postTarget(input);
  try {
    assertCap("assign");
    const parsed = assignTargetSchema.parse(input);
    const actorId = getSessionUserId();
    const type = await targetTypeRepository.findById(parsed.typeId);
    if (!type) throw new ValidationError("Invalid target type");
    const category = await targetCategoryRepository.findById(parsed.categoryId);
    if (!category) throw new ValidationError("Invalid category");
    if (!category.active) throw new ValidationError("Category is inactive");
    if (!type.active) throw new ValidationError("Target type is inactive");
    if (type.categoryId !== category.id) {
      throw new ValidationError("Type does not belong to the selected category");
    }

    const metrics = computeTargetProgress({
      quantity: parsed.quantity,
      completedQuantity: 0,
      startDate: parsed.startDate,
      endDate: parsed.endDate,
      status: parsed.status,
    });

    const target = enrichWithAudit(
      {
        id: createId("pt"),
        title: parsed.title,
        description: parsed.description,
        categoryId: parsed.categoryId,
        typeId: parsed.typeId,
        templateId: parsed.templateId ?? null,
        quantity: parsed.quantity,
        unit: parsed.unit || type.unit,
        completedQuantity: 0,
        startDate: parsed.startDate,
        endDate: parsed.endDate,
        priority: parsed.priority,
        weight: parsed.weight,
        assigneeScope: parsed.assigneeScope,
        assigneeIds: parsed.assigneeIds,
        department: parsed.department,
        branch: parsed.branch,
        roleKey: parsed.roleKey,
        ownerId: parsed.ownerId || actorId,
        status: parsed.status,
        health: metrics.health,
        riskLevel: metrics.riskLevel,
        notes: parsed.notes,
        expectedCompletion: parsed.expectedCompletion ?? null,
        performanceScore: metrics.performanceScore,
      },
      actorId
    );

    await performanceTargetRepository.create(target);
    if (parsed.generateTasks !== false) {
      await generateTasksForTarget(target, type);
    }
    await writeHistory(target.id, "assigned", {
      quantity: target.quantity,
      assigneeIds: target.assigneeIds,
    });
    emitTargetsUpdated();

    await notifyQuietly(async () => {
      const { notifyTargetAssigned } = await import(
        "@/services/notification.service"
      );
      await notifyTargetAssigned(target);
    });

    return ok(withMetrics(target));
  } catch (error) {
    return fromError(error, {
      id: "",
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
