import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  TargetAssigneeScope,
  TargetHealth,
  TargetPriority,
  TargetRiskLevel,
  TargetStatus,
  TaskStatus,
  WorkOrigin,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { writeActivity } from "../common/activity-writer";
import { isValidDateTimeRange } from "../common/flexible-datetime";
import { parseDate, parseDateEnd } from "../common/mappers";
import {
  isOrganicAdsType,
  taskTagForTargetType,
} from "../lib/organic-ads-task-match";
import {
  buildTaskTitle,
  computeTargetProgress,
  MAX_AUTO_TASKS_PER_TARGET,
} from "../lib/target-progress";
import { assertCap, mapTaskPriority, type Actor } from "./targets-access";
import { assertCanAssignToTeam } from "../lib/team";
import { AppRole } from "../common/roles";
import { mapTarget } from "./targets-mappers";
import { TargetsNotifyService } from "./targets-notify.service";

@Injectable()
export class TargetsAssignService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notify: TargetsNotifyService
  ) {}

  async assignTarget(
    companyId: string,
    actor: Actor,
    body: Record<string, unknown>
  ) {
    const title = String(body.title ?? "").trim();
    const categoryId = String(body.categoryId ?? "");
    const typeId = String(body.typeId ?? "");
    const quantity = Math.max(1, Math.floor(Number(body.quantity ?? 1)));
    const startDate = String(body.startDate ?? "");
    const endDate = String(body.endDate ?? "");
    const assigneeIds = Array.isArray(body.assigneeIds)
      ? (body.assigneeIds as string[]).map(String).filter(Boolean)
      : [];

    if (actor.role === AppRole.admin) {
      assertCap(actor, "assign");
    } else {
      await assertCanAssignToTeam(this.prisma, companyId, actor, assigneeIds);
    }

    if (!title) throw new BadRequestException("title is required");
    if (!categoryId || !typeId)
      throw new BadRequestException("categoryId and typeId are required");
    if (!startDate || !endDate)
      throw new BadRequestException("startDate and endDate are required");
    if (!isValidDateTimeRange(startDate, endDate))
      throw new BadRequestException("endDate must be on or after startDate");
    if (assigneeIds.length === 0)
      throw new BadRequestException("assigneeIds required");

    const [category, type] = await Promise.all([
      this.prisma.targetCategory.findFirst({
        where: { id: categoryId, companyId, deletedAt: null },
      }),
      this.prisma.targetType.findFirst({
        where: { id: typeId, companyId, deletedAt: null },
      }),
    ]);
    if (!category) throw new NotFoundException("Category not found");
    if (!type) throw new NotFoundException("Type not found");
    if (!category.active) {
      throw new BadRequestException("Category is inactive");
    }
    if (!type.active) {
      throw new BadRequestException("Target type is inactive");
    }
    if (type.categoryId !== category.id) {
      throw new BadRequestException(
        "Type does not belong to the selected category"
      );
    }

    const priority = (String(body.priority ?? "medium") as TargetPriority) ||
      TargetPriority.medium;
    const status =
      (String(body.status ?? "assigned") as TargetStatus) ||
      TargetStatus.assigned;
    const generateTasks =
      isOrganicAdsType(type) || body.generateTasks !== false;

    const metrics = computeTargetProgress({
      quantity,
      completedQuantity: 0,
      startDate,
      endDate,
      status,
    });

    const created = await this.prisma.performanceTarget.create({
      data: {
        companyId,
        title,
        description: String(body.description ?? ""),
        categoryId,
        typeId,
        templateId:
          body.templateId === null || body.templateId === undefined
            ? null
            : String(body.templateId),
        quantity,
        unit: String(body.unit ?? type.unit ?? "unit"),
        completedQuantity: 0,
        startDate: parseDate(startDate),
        endDate: parseDateEnd(endDate),
        priority,
        weight: Number(body.weight ?? 1),
        assigneeScope:
          (String(body.assigneeScope ?? "employee") as TargetAssigneeScope) ||
          TargetAssigneeScope.employee,
        assigneeIds,
        department: String(body.department ?? ""),
        branch: String(body.branch ?? ""),
        roleKey: String(body.roleKey ?? ""),
        ownerId: String(body.ownerId ?? actor.userId),
        status,
        health: metrics.health as TargetHealth,
        riskLevel: metrics.riskLevel as TargetRiskLevel,
        notes: String(body.notes ?? ""),
        expectedCompletion: body.expectedCompletion
          ? parseDateEnd(String(body.expectedCompletion))
          : null,
        performanceScore: metrics.performanceScore,
        assignedAt: status === "draft" ? null : new Date(),
        completedAt: status === "completed" ? new Date() : null,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      },
    });

    let linkedTaskCount = 0;
    if (generateTasks) {
      linkedTaskCount = await this.generateLinkedTasks(
        companyId,
        actor,
        created.id,
        type,
        {
          quantity,
          title,
          endDate,
          priority,
          assigneeIds,
          description: String(body.description ?? ""),
        }
      );
    }

    await this.notify.writeHistory(companyId, created.id, actor.userId, "assigned", {
      quantity,
      assigneeIds,
      linkedTaskCount,
    });

    await this.notify.notifyAssignees(companyId, actor.userId, created, "assigned");
    if (linkedTaskCount > 0) {
      await this.notify.notifyLinkedTasksCreated(
        companyId,
        actor.userId,
        created,
        linkedTaskCount
      );
    }

    await writeActivity(this.prisma, {
      companyId,
      type: "announcement",
      title: "Target assigned",
      description: created.title,
      employeeId: assigneeIds[0],
      actorId: actor.userId,
    });

    return mapTarget(created);
  }

  private async generateLinkedTasks(
    companyId: string,
    actor: Actor,
    targetId: string,
    type: { name: string; taskTitleTemplate: string; unit: string },
    opts: {
      quantity: number;
      title: string;
      endDate: string;
      priority: TargetPriority;
      assigneeIds: string[];
      description: string;
    }
  ): Promise<number> {
    const count = Math.min(opts.quantity, MAX_AUTO_TASKS_PER_TARGET);
    if (count <= 0) return 0;
    const assignedAt = new Date();
    const data = Array.from({ length: count }, (_, i) => ({
      companyId,
      title: buildTaskTitle(type.taskTitleTemplate, type.name, i + 1),
      description: opts.description || `Auto task for target: ${opts.title}`,
      status: TaskStatus.todo,
      priority: mapTaskPriority(opts.priority),
      dueDate: parseDateEnd(opts.endDate),
      tag: taskTagForTargetType(type),
      estimateMin: 0,
      assigneeIds: opts.assigneeIds,
      targetId,
      origin: WorkOrigin.assigned,
      assignedAt,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    }));

    await this.prisma.workTask.createMany({ data });
    return count;
  }
}
