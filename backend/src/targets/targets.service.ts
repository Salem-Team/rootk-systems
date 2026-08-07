import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  Prisma,
  TargetAssigneeScope,
  TargetHealth,
  TargetPenaltyType,
  TargetPriority,
  TargetRiskLevel,
  TargetStatus,
  TaskPriority,
  TaskStatus,
  WorkOrigin,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { auditFields, dateOnly, isoOrNull, parseDate } from "../common/mappers";
import { writeActivity } from "../common/activity-writer";
import { AppRole } from "../common/roles";
import { canTarget } from "../lib/target-policies";
import {
  buildTaskTitle,
  computeTargetProgress,
  MAX_AUTO_TASKS_PER_TARGET,
} from "../lib/target-progress";

type Actor = {
  userId: string;
  role: "admin" | "employee";
  employeeId: string;
};

function mapCategory(row: {
  id: string;
  name: string;
  color: string;
  icon: string;
  description: string;
  active: boolean;
  sortOrder: number;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  deletedAt: Date | null;
  isArchived: boolean;
  version: number;
  metadata: unknown;
}) {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    icon: row.icon,
    description: row.description,
    active: row.active,
    sortOrder: row.sortOrder,
    ...auditFields(row),
  };
}

function mapType(row: {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  unit: string;
  taskTitleTemplate: string;
  active: boolean;
  sortOrder: number;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  deletedAt: Date | null;
  isArchived: boolean;
  version: number;
  metadata: unknown;
}) {
  return {
    id: row.id,
    categoryId: row.categoryId,
    name: row.name,
    description: row.description,
    unit: row.unit,
    taskTitleTemplate: row.taskTitleTemplate,
    active: row.active,
    sortOrder: row.sortOrder,
    ...auditFields(row),
  };
}

function mapTemplateItem(row: {
  id: string;
  companyId: string;
  templateId: string;
  typeId: string;
  quantity: number;
  unit: string;
  weight: number;
  sortOrder: number;
}) {
  return {
    id: row.id,
    companyId: row.companyId,
    templateId: row.templateId,
    typeId: row.typeId,
    quantity: row.quantity,
    unit: row.unit,
    weight: row.weight,
    sortOrder: row.sortOrder,
  };
}

function mapTarget(row: {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  typeId: string;
  templateId: string | null;
  quantity: number;
  unit: string;
  completedQuantity: number;
  startDate: Date;
  endDate: Date;
  priority: TargetPriority;
  weight: number;
  assigneeScope: TargetAssigneeScope;
  assigneeIds: string[];
  department: string;
  branch: string;
  roleKey: string;
  ownerId: string;
  status: TargetStatus;
  health: TargetHealth;
  riskLevel: TargetRiskLevel;
  notes: string;
  expectedCompletion: Date | null;
  performanceScore: number;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  deletedAt: Date | null;
  isArchived: boolean;
  version: number;
  metadata: unknown;
}) {
  const metrics = computeTargetProgress({
    quantity: row.quantity,
    completedQuantity: row.completedQuantity,
    startDate: dateOnly(row.startDate),
    endDate: dateOnly(row.endDate),
    status: row.status,
  });
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    categoryId: row.categoryId,
    typeId: row.typeId,
    templateId: row.templateId,
    quantity: row.quantity,
    unit: row.unit,
    completedQuantity: row.completedQuantity,
    startDate: dateOnly(row.startDate),
    endDate: dateOnly(row.endDate),
    priority: row.priority,
    weight: row.weight,
    assigneeScope: row.assigneeScope,
    assigneeIds: row.assigneeIds,
    department: row.department,
    branch: row.branch,
    roleKey: row.roleKey,
    ownerId: row.ownerId,
    status: row.status,
    health: row.health,
    riskLevel: row.riskLevel,
    notes: row.notes,
    expectedCompletion: row.expectedCompletion
      ? dateOnly(row.expectedCompletion)
      : null,
    performanceScore: row.performanceScore,
    metrics,
    ...auditFields(row),
  };
}

type MappedTarget = ReturnType<typeof mapTarget>;

function mapWarning(row: {
  id: string;
  targetId: string;
  employeeId: string;
  reason: string;
  managerNotes: string;
  requiredAction: string;
  penaltyType: TargetPenaltyType;
  penaltyNote: string;
  acknowledgedAt: Date | null;
  acknowledgedBy: string | null;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  deletedAt: Date | null;
  isArchived: boolean;
  version: number;
  metadata: unknown;
}) {
  return {
    id: row.id,
    targetId: row.targetId,
    employeeId: row.employeeId,
    reason: row.reason,
    managerNotes: row.managerNotes,
    requiredAction: row.requiredAction,
    penaltyType: row.penaltyType,
    penaltyNote: row.penaltyNote,
    acknowledgedAt: isoOrNull(row.acknowledgedAt),
    acknowledgedBy: row.acknowledgedBy,
    ...auditFields(row),
  };
}

function assertAdmin(actor: Actor, capability: Parameters<typeof canTarget>[1]) {
  if (!canTarget(actor.role, capability)) {
    throw new ForbiddenException("Insufficient target permissions");
  }
}

function mapTaskPriority(p: TargetPriority): TaskPriority {
  if (p === "critical" || p === "high") return TaskPriority.high;
  if (p === "low") return TaskPriority.low;
  return TaskPriority.medium;
}

@Injectable()
export class TargetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService
  ) {}

  // ── Categories ──────────────────────────────────────────────────────────

  listCategories(companyId: string) {
    return this.prisma.targetCategory
      .findMany({
        where: { companyId, deletedAt: null },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      })
      .then((rows) => rows.map(mapCategory));
  }

  async upsertCategory(
    companyId: string,
    actor: Actor,
    body: Record<string, unknown>
  ) {
    assertAdmin(actor, "manage_categories");
    const id = typeof body.id === "string" ? body.id : undefined;
    const data = {
      name: String(body.name ?? "").trim(),
      color: String(body.color ?? "#082868"),
      icon: String(body.icon ?? "Target"),
      description: String(body.description ?? ""),
      active: body.active !== false,
      sortOrder: Number(body.sortOrder ?? 0),
      updatedBy: actor.userId,
    };
    if (!data.name) throw new BadRequestException("Category name is required");

    if (id) {
      const current = await this.prisma.targetCategory.findFirst({
        where: { id, companyId, deletedAt: null },
      });
      if (!current) throw new NotFoundException("Category not found");
      const row = await this.prisma.targetCategory.update({
        where: { id },
        data: { ...data, version: { increment: 1 } },
      });
      return mapCategory(row);
    }

    const row = await this.prisma.targetCategory.create({
      data: {
        companyId,
        ...data,
        createdBy: actor.userId,
      },
    });
    return mapCategory(row);
  }

  async deleteCategory(companyId: string, actor: Actor, id: string) {
    assertAdmin(actor, "manage_categories");
    const current = await this.prisma.targetCategory.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!current) throw new NotFoundException("Category not found");
    await this.prisma.targetCategory.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isArchived: true,
        updatedBy: actor.userId,
        version: { increment: 1 },
      },
    });
    return { ok: true };
  }

  // ── Types ───────────────────────────────────────────────────────────────

  listTypes(companyId: string, categoryId?: string) {
    return this.prisma.targetType
      .findMany({
        where: {
          companyId,
          deletedAt: null,
          ...(categoryId ? { categoryId } : {}),
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      })
      .then((rows) => rows.map(mapType));
  }

  async upsertType(
    companyId: string,
    actor: Actor,
    body: Record<string, unknown>
  ) {
    assertAdmin(actor, "manage_types");
    const id = typeof body.id === "string" ? body.id : undefined;
    const categoryId = String(body.categoryId ?? "");
    if (!categoryId) throw new BadRequestException("categoryId is required");
    const cat = await this.prisma.targetCategory.findFirst({
      where: { id: categoryId, companyId, deletedAt: null },
    });
    if (!cat) throw new NotFoundException("Category not found");

    const data = {
      categoryId,
      name: String(body.name ?? "").trim(),
      description: String(body.description ?? ""),
      unit: String(body.unit ?? "unit"),
      taskTitleTemplate: String(body.taskTitleTemplate ?? "{name} #{n}"),
      active: body.active !== false,
      sortOrder: Number(body.sortOrder ?? 0),
      updatedBy: actor.userId,
    };
    if (!data.name) throw new BadRequestException("Type name is required");

    if (id) {
      const current = await this.prisma.targetType.findFirst({
        where: { id, companyId, deletedAt: null },
      });
      if (!current) throw new NotFoundException("Type not found");
      const row = await this.prisma.targetType.update({
        where: { id },
        data: { ...data, version: { increment: 1 } },
      });
      return mapType(row);
    }

    const row = await this.prisma.targetType.create({
      data: { companyId, ...data, createdBy: actor.userId },
    });
    return mapType(row);
  }

  async deleteType(companyId: string, actor: Actor, id: string) {
    assertAdmin(actor, "manage_types");
    const current = await this.prisma.targetType.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!current) throw new NotFoundException("Type not found");
    await this.prisma.targetType.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isArchived: true,
        updatedBy: actor.userId,
        version: { increment: 1 },
      },
    });
    return { ok: true };
  }

  // ── Templates ───────────────────────────────────────────────────────────

  async listTemplates(companyId: string) {
    const rows = await this.prisma.targetTemplate.findMany({
      where: { companyId, deletedAt: null },
      include: { items: { orderBy: { sortOrder: "asc" } } },
      orderBy: { name: "asc" },
    });
    return rows.map((row) => ({
      id: row.id,
      categoryId: row.categoryId,
      name: row.name,
      description: row.description,
      active: row.active,
      items: row.items.map(mapTemplateItem),
      ...auditFields(row),
    }));
  }

  async upsertTemplate(
    companyId: string,
    actor: Actor,
    body: Record<string, unknown>
  ) {
    assertAdmin(actor, "manage_templates");
    const id = typeof body.id === "string" ? body.id : undefined;
    const name = String(body.name ?? "").trim();
    if (!name) throw new BadRequestException("Template name is required");
    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) {
      throw new BadRequestException("Template requires at least one item");
    }

    const templateData = {
      name,
      description: String(body.description ?? ""),
      categoryId:
        body.categoryId === null || body.categoryId === undefined
          ? null
          : String(body.categoryId),
      active: body.active !== false,
      updatedBy: actor.userId,
    };

    const normalizedItems = items.map((raw, index) => {
      const item = raw as Record<string, unknown>;
      return {
        companyId,
        typeId: String(item.typeId ?? ""),
        quantity: Math.max(1, Number(item.quantity ?? 1)),
        unit: String(item.unit ?? "unit"),
        weight: Number(item.weight ?? 1),
        sortOrder: Number(item.sortOrder ?? index),
      };
    });
    if (normalizedItems.some((i) => !i.typeId)) {
      throw new BadRequestException("Each template item needs typeId");
    }

    return this.prisma.$transaction(async (tx) => {
      let templateId = id;
      if (templateId) {
        const current = await tx.targetTemplate.findFirst({
          where: { id: templateId, companyId, deletedAt: null },
        });
        if (!current) throw new NotFoundException("Template not found");
        await tx.targetTemplate.update({
          where: { id: templateId },
          data: { ...templateData, version: { increment: 1 } },
        });
        await tx.targetTemplateItem.deleteMany({ where: { templateId } });
      } else {
        const created = await tx.targetTemplate.create({
          data: {
            companyId,
            ...templateData,
            createdBy: actor.userId,
          },
        });
        templateId = created.id;
      }

      await tx.targetTemplateItem.createMany({
        data: normalizedItems.map((item) => ({
          ...item,
          templateId: templateId!,
        })),
      });

      const row = await tx.targetTemplate.findFirstOrThrow({
        where: { id: templateId },
        include: { items: { orderBy: { sortOrder: "asc" } } },
      });
      return {
        id: row.id,
        categoryId: row.categoryId,
        name: row.name,
        description: row.description,
        active: row.active,
        items: row.items.map(mapTemplateItem),
        ...auditFields(row),
      };
    });
  }

  async deleteTemplate(companyId: string, actor: Actor, id: string) {
    assertAdmin(actor, "manage_templates");
    const current = await this.prisma.targetTemplate.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!current) throw new NotFoundException("Template not found");
    await this.prisma.targetTemplate.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isArchived: true,
        updatedBy: actor.userId,
        version: { increment: 1 },
      },
    });
    return { ok: true };
  }

  // ── Targets ─────────────────────────────────────────────────────────────

  async listTargets(
    companyId: string,
    actor: Actor,
    filters: Record<string, string | undefined> = {}
  ) {
    const where: Prisma.PerformanceTargetWhereInput = {
      companyId,
      deletedAt: null,
    };

    if (actor.role === AppRole.employee) {
      where.assigneeIds = { has: actor.employeeId };
    } else if (filters.employeeId) {
      where.assigneeIds = { has: filters.employeeId };
    }

    if (filters.department) where.department = filters.department;
    if (filters.branch) where.branch = filters.branch;
    if (filters.roleKey) where.roleKey = filters.roleKey;
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.typeId) where.typeId = filters.typeId;
    if (filters.priority) where.priority = filters.priority as TargetPriority;
    if (filters.status) where.status = filters.status as TargetStatus;
    if (filters.riskLevel)
      where.riskLevel = filters.riskLevel as TargetRiskLevel;
    if (filters.createdBy) where.createdBy = filters.createdBy;
    if (filters.delayedOnly === "true") {
      where.status = TargetStatus.delayed;
    }
    if (filters.completedOnly === "true") {
      where.status = TargetStatus.completed;
    }
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
        { notes: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const rows = await this.prisma.performanceTarget.findMany({
      where,
      orderBy: [{ endDate: "asc" }, { priority: "desc" }],
    });

    let mapped = rows.map((r) => mapTarget(r));

    if (filters.hasWarning === "true") {
      const warned = await this.prisma.targetWarning.findMany({
        where: { companyId, deletedAt: null },
        select: { targetId: true },
      });
      const set = new Set(warned.map((w) => w.targetId));
      mapped = mapped.filter((t) => set.has(t.id));
    }

    if (filters.minProgress) {
      const min = Number(filters.minProgress);
      mapped = mapped.filter((t) => (t.metrics?.percentage ?? 0) >= min);
    }
    if (filters.maxProgress) {
      const max = Number(filters.maxProgress);
      mapped = mapped.filter((t) => (t.metrics?.percentage ?? 0) <= max);
    }

    return mapped;
  }

  async getTarget(companyId: string, actor: Actor, id: string) {
    const row = await this.prisma.performanceTarget.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!row) throw new NotFoundException("Target not found");
    if (
      actor.role === AppRole.employee &&
      !row.assigneeIds.includes(actor.employeeId)
    ) {
      throw new ForbiddenException("Not allowed to view this target");
    }
    return mapTarget(row);
  }

  async assignTarget(
    companyId: string,
    actor: Actor,
    body: Record<string, unknown>
  ) {
    assertAdmin(actor, "assign");
    const title = String(body.title ?? "").trim();
    const categoryId = String(body.categoryId ?? "");
    const typeId = String(body.typeId ?? "");
    const quantity = Math.max(1, Math.floor(Number(body.quantity ?? 1)));
    const startDate = String(body.startDate ?? "");
    const endDate = String(body.endDate ?? "");
    const assigneeIds = Array.isArray(body.assigneeIds)
      ? (body.assigneeIds as string[]).map(String).filter(Boolean)
      : [];

    if (!title) throw new BadRequestException("title is required");
    if (!categoryId || !typeId)
      throw new BadRequestException("categoryId and typeId are required");
    if (!startDate || !endDate)
      throw new BadRequestException("startDate and endDate are required");
    if (endDate < startDate)
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
    const generateTasks = body.generateTasks !== false;

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
        endDate: parseDate(endDate),
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
          ? parseDate(String(body.expectedCompletion))
          : null,
        performanceScore: metrics.performanceScore,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      },
    });

    if (generateTasks) {
      await this.generateLinkedTasks(companyId, actor, created.id, type, {
        quantity,
        title,
        endDate,
        priority,
        assigneeIds,
        description: String(body.description ?? ""),
      });
    }

    await this.writeHistory(companyId, created.id, actor.userId, "assigned", {
      quantity,
      assigneeIds,
    });

    await this.notifyAssignees(companyId, actor.userId, created, "assigned");

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

  async updateTarget(
    companyId: string,
    actor: Actor,
    id: string,
    body: Record<string, unknown>
  ) {
    assertAdmin(actor, "edit");
    const current = await this.prisma.performanceTarget.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!current) throw new NotFoundException("Target not found");

    // Progress fields are never editable manually.
    const row = await this.prisma.performanceTarget.update({
      where: { id },
      data: {
        title:
          body.title !== undefined ? String(body.title) : undefined,
        description:
          body.description !== undefined
            ? String(body.description)
            : undefined,
        priority:
          body.priority !== undefined
            ? (String(body.priority) as TargetPriority)
            : undefined,
        weight:
          body.weight !== undefined ? Number(body.weight) : undefined,
        notes: body.notes !== undefined ? String(body.notes) : undefined,
        endDate:
          body.endDate !== undefined
            ? parseDate(String(body.endDate))
            : undefined,
        startDate:
          body.startDate !== undefined
            ? parseDate(String(body.startDate))
            : undefined,
        status:
          body.status !== undefined
            ? (String(body.status) as TargetStatus)
            : undefined,
        assigneeIds:
          body.assigneeIds !== undefined
            ? (body.assigneeIds as string[])
            : undefined,
        department:
          body.department !== undefined
            ? String(body.department)
            : undefined,
        branch: body.branch !== undefined ? String(body.branch) : undefined,
        updatedBy: actor.userId,
        version: { increment: 1 },
      },
    });

    await this.writeHistory(companyId, id, actor.userId, "updated", body);
    await this.notifyAssignees(companyId, actor.userId, row, "updated");
    return this.recalculateTarget(companyId, id, actor.userId);
  }

  async deleteTarget(companyId: string, actor: Actor, id: string) {
    assertAdmin(actor, "delete");
    const current = await this.prisma.performanceTarget.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!current) throw new NotFoundException("Target not found");
    await this.prisma.performanceTarget.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isArchived: true,
        status: TargetStatus.archived,
        updatedBy: actor.userId,
        version: { increment: 1 },
      },
    });
    await this.writeHistory(companyId, id, actor.userId, "archived", {});
    return { ok: true };
  }

  /**
   * Event hook: WorkTask status changed → recalculate linked target.
   * Called from WorkService (no manual % edits).
   */
  async onLinkedTaskStatusChanged(
    companyId: string,
    taskId: string,
    actorId: string
  ) {
    const task = await this.prisma.workTask.findFirst({
      where: { id: taskId, companyId, deletedAt: null },
    });
    if (!task?.targetId) return null;
    return this.recalculateTarget(companyId, task.targetId, actorId);
  }

  async recalculateTarget(
    companyId: string,
    targetId: string,
    actorId: string
  ) {
    const target = await this.prisma.performanceTarget.findFirst({
      where: { id: targetId, companyId, deletedAt: null },
    });
    if (!target) return null;

    const completedCount = await this.prisma.workTask.count({
      where: {
        companyId,
        targetId,
        deletedAt: null,
        status: TaskStatus.completed,
      },
    });

    const metrics = computeTargetProgress({
      quantity: target.quantity,
      completedQuantity: completedCount,
      startDate: dateOnly(target.startDate),
      endDate: dateOnly(target.endDate),
      status: target.status,
    });

    const prevCompleted = target.completedQuantity;
    const row = await this.prisma.performanceTarget.update({
      where: { id: targetId },
      data: {
        completedQuantity: completedCount,
        status: metrics.derivedStatus as TargetStatus,
        health: metrics.health as TargetHealth,
        riskLevel: metrics.riskLevel as TargetRiskLevel,
        performanceScore: metrics.performanceScore,
        updatedBy: actorId,
        version: { increment: 1 },
      },
    });

    if (completedCount !== prevCompleted) {
      await this.writeHistory(companyId, targetId, actorId, "progress", {
        completedQuantity: completedCount,
        percentage: metrics.percentage,
      });
      await this.notifyAssignees(
        companyId,
        actorId,
        row,
        metrics.derivedStatus === "completed" ? "completed" : "progress"
      );
    }

    await this.maybeDeadlineWarning(companyId, actorId, row, metrics);
    return mapTarget(row);
  }

  // ── Warnings ────────────────────────────────────────────────────────────

  async listWarnings(
    companyId: string,
    actor: Actor,
    filters: { targetId?: string; employeeId?: string } = {}
  ) {
    const where: Prisma.TargetWarningWhereInput = {
      companyId,
      deletedAt: null,
    };
    if (filters.targetId) where.targetId = filters.targetId;
    if (actor.role === AppRole.employee) {
      where.employeeId = actor.employeeId;
    } else if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }

    const rows = await this.prisma.targetWarning.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapWarning);
  }

  async sendWarning(
    companyId: string,
    actor: Actor,
    body: Record<string, unknown>
  ) {
    assertAdmin(actor, "send_warnings");
    const targetId = String(body.targetId ?? "");
    const employeeId = String(body.employeeId ?? "");
    const reason = String(body.reason ?? "").trim();
    if (!targetId || !employeeId || reason.length < 3) {
      throw new BadRequestException("targetId, employeeId, reason required");
    }

    const target = await this.prisma.performanceTarget.findFirst({
      where: { id: targetId, companyId, deletedAt: null },
    });
    if (!target) throw new NotFoundException("Target not found");

    const metrics = computeTargetProgress({
      quantity: target.quantity,
      completedQuantity: target.completedQuantity,
      startDate: dateOnly(target.startDate),
      endDate: dateOnly(target.endDate),
      status: target.status,
    });

    const row = await this.prisma.targetWarning.create({
      data: {
        companyId,
        targetId,
        employeeId,
        reason,
        managerNotes: String(body.managerNotes ?? ""),
        requiredAction: String(body.requiredAction ?? ""),
        penaltyType:
          (String(body.penaltyType ?? "written_warning") as TargetPenaltyType) ||
          TargetPenaltyType.written_warning,
        penaltyNote: String(body.penaltyNote ?? ""),
        createdBy: actor.userId,
        updatedBy: actor.userId,
      },
    });

    const users = await this.prisma.user.findMany({
      where: { companyId, employeeId, deletedAt: null, isActive: true },
      select: { id: true },
    });

    await this.notifications.notifyDomain({
      companyId,
      actorId: actor.userId,
      category: "target",
      priority: "urgent",
      audience: "employee",
      titleKey: "notifications.targetWarningTitle",
      bodyKey: "notifications.targetWarningBody",
      vars: {
        title: target.title,
        progress: `${metrics.percentage}%`,
        deadline: dateOnly(target.endDate),
        remaining: metrics.remaining,
      },
      href: "/targets/warnings",
      entityType: "target_warning",
      entityId: row.id,
      recipientIds: users.map((u) => u.id),
    });

    await this.writeHistory(companyId, targetId, actor.userId, "warning", {
      warningId: row.id,
      penaltyType: row.penaltyType,
    });

    return mapWarning(row);
  }

  async acknowledgeWarning(companyId: string, actor: Actor, id: string) {
    const row = await this.prisma.targetWarning.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!row) throw new NotFoundException("Warning not found");
    if (
      actor.role === AppRole.employee &&
      row.employeeId !== actor.employeeId
    ) {
      throw new ForbiddenException("Not your warning");
    }
    const updated = await this.prisma.targetWarning.update({
      where: { id },
      data: {
        acknowledgedAt: new Date(),
        acknowledgedBy: actor.userId,
        updatedBy: actor.userId,
        version: { increment: 1 },
      },
    });
    return mapWarning(updated);
  }

  // ── Delayed center ──────────────────────────────────────────────────────

  async delayedCenter(companyId: string, actor: Actor) {
    const targets = await this.listTargets(companyId, actor, {});
    const delayedTargets = targets.filter(
      (t) =>
        t.status === "delayed" ||
        t.riskLevel === "critical" ||
        t.riskLevel === "high" ||
        t.health === "critical" ||
        t.health === "delayed"
    );

    const taskWhere: Prisma.WorkTaskWhereInput = {
      companyId,
      deletedAt: null,
      OR: [
        {
          dueDate: { lt: new Date() },
          status: { not: TaskStatus.completed },
        },
        { targetId: { in: delayedTargets.map((t) => t.id) } },
      ],
    };
    if (actor.role === AppRole.employee) {
      taskWhere.assigneeIds = { has: actor.employeeId };
    }

    const delayedTasks = await this.prisma.workTask.findMany({
      where: taskWhere,
      orderBy: { dueDate: "asc" },
      take: 200,
    });

    return {
      delayedTargets,
      criticalTargets: targets.filter(
        (t) => t.priority === "critical" || t.riskLevel === "critical"
      ),
      highRiskTargets: targets.filter((t) => t.riskLevel === "high"),
      delayedTasks: delayedTasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate ? dateOnly(t.dueDate) : "",
        assigneeIds: t.assigneeIds,
        targetId: t.targetId,
        ...auditFields(t),
      })),
    };
  }

  // ── Dashboard ───────────────────────────────────────────────────────────

  async dashboard(companyId: string, actor: Actor) {
    const targets = await this.listTargets(companyId, actor, {});
    const categories = await this.listCategories(companyId);
    const catMap = new Map(categories.map((c) => [c.id, c]));

    const total = targets.length;
    const completed = targets.filter((t) => t.status === "completed").length;
    const delayed = targets.filter((t) => t.status === "delayed").length;
    const critical = targets.filter(
      (t) => t.priority === "critical" || t.riskLevel === "critical"
    ).length;
    const inProgress = targets.filter(
      (t) =>
        t.status === "in_progress" ||
        t.status === "on_track" ||
        t.status === "behind_schedule" ||
        t.status === "assigned"
    ).length;

    const scores = targets.map((t) => t.performanceScore);
    const averagePerformance =
      scores.length === 0
        ? 0
        : Math.round(
            (scores.reduce((a, b) => a + b, 0) / scores.length) * 10
          ) / 10;

    const employeeScores = new Map<
      string,
      { score: number; completed: number; total: number }
    >();
    for (const t of targets) {
      for (const empId of t.assigneeIds) {
        const cur = employeeScores.get(empId) ?? {
          score: 0,
          completed: 0,
          total: 0,
        };
        cur.total += 1;
        cur.score += t.performanceScore;
        if (t.status === "completed") cur.completed += 1;
        employeeScores.set(empId, cur);
      }
    }

    const ranked = [...employeeScores.entries()]
      .map(([employeeId, v]) => ({
        employeeId,
        score: Math.round((v.score / Math.max(1, v.total)) * 10) / 10,
        completed: v.completed,
        total: v.total,
      }))
      .sort((a, b) => b.score - a.score);

    const employeesAtRisk = ranked.filter((e) => e.score < 50).length;
    const upcomingDeadlines = targets.filter((t) => {
      const days = t.metrics?.remainingDays ?? 99;
      return days <= 7 && t.status !== "completed" && t.status !== "cancelled";
    }).length;

    const byCategoryMap = new Map<
      string,
      { id: string; name: string; color: string; count: number }
    >();
    for (const t of targets) {
      const cat = catMap.get(t.categoryId);
      const key = t.categoryId;
      const cur = byCategoryMap.get(key) ?? {
        id: key,
        name: cat?.name ?? "—",
        color: cat?.color ?? "#082868",
        count: 0,
      };
      cur.count += 1;
      byCategoryMap.set(key, cur);
    }

    const statusCounts = new Map<string, number>();
    for (const t of targets) {
      statusCounts.set(t.status, (statusCounts.get(t.status) ?? 0) + 1);
    }

    const deptMap = new Map<
      string,
      { department: string; count: number; scoreSum: number }
    >();
    for (const t of targets) {
      const dept = t.department || "—";
      const cur = deptMap.get(dept) ?? {
        department: dept,
        count: 0,
        scoreSum: 0,
      };
      cur.count += 1;
      cur.scoreSum += t.performanceScore;
      deptMap.set(dept, cur);
    }

    return {
      total,
      completed,
      inProgress,
      delayed,
      critical,
      completionRate:
        total === 0 ? 0 : Math.round((completed / total) * 1000) / 10,
      averagePerformance,
      employeesAtRisk,
      upcomingDeadlines,
      byCategory: [...byCategoryMap.values()],
      byStatus: [...statusCounts.entries()].map(([status, count]) => ({
        status: status as TargetStatus,
        count,
      })),
      byDepartment: [...deptMap.values()].map((d) => ({
        department: d.department,
        count: d.count,
        avgScore: Math.round((d.scoreSum / d.count) * 10) / 10,
      })),
      topPerformers: ranked.slice(0, 5),
      bottomPerformers: ranked.slice(-5).reverse(),
      completionTrend: this.buildTrend(targets),
    };
  }

  async employeePerformance(
    companyId: string,
    actor: Actor,
    employeeId: string
  ) {
    if (
      actor.role === AppRole.employee &&
      actor.employeeId !== employeeId
    ) {
      throw new ForbiddenException("Not allowed");
    }
    const targets = await this.listTargets(companyId, actor, { employeeId });
    const warnings = await this.listWarnings(companyId, actor, { employeeId });
    const delayedTasks = await this.prisma.workTask.count({
      where: {
        companyId,
        deletedAt: null,
        assigneeIds: { has: employeeId },
        status: { not: TaskStatus.completed },
        dueDate: { lt: new Date() },
      },
    });

    const scores = targets.map((t) => t.performanceScore);
    const overallScore =
      scores.length === 0
        ? 0
        : Math.round(
            (scores.reduce((a, b) => a + b, 0) / scores.length) * 10
          ) / 10;

    return {
      employeeId,
      overallScore,
      currentTargets: targets.filter(
        (t) => t.status !== "completed" && t.status !== "cancelled"
      ).length,
      completed: targets.filter((t) => t.status === "completed").length,
      remaining: targets
        .map((t) => t.metrics?.remaining ?? 0)
        .reduce((a, b) => a + b, 0),
      warnings: warnings.length,
      delayedTasks,
      monthlyTrend: this.buildMonthlyTrend(targets),
      targets,
    };
  }

  // ── Internals ───────────────────────────────────────────────────────────

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
  ) {
    const count = Math.min(opts.quantity, MAX_AUTO_TASKS_PER_TARGET);
    const data = Array.from({ length: count }, (_, i) => ({
      companyId,
      title: buildTaskTitle(type.taskTitleTemplate, type.name, i + 1),
      description: opts.description || `Auto task for target: ${opts.title}`,
      status: TaskStatus.todo,
      priority: mapTaskPriority(opts.priority),
      dueDate: parseDate(opts.endDate),
      tag: type.name,
      estimateMin: 0,
      assigneeIds: opts.assigneeIds,
      targetId,
      origin: WorkOrigin.assigned,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    }));

    await this.prisma.workTask.createMany({ data });
  }

  private async writeHistory(
    companyId: string,
    targetId: string,
    actorId: string,
    action: string,
    snapshot: Record<string, unknown>
  ) {
    await this.prisma.targetHistoryEvent.create({
      data: {
        companyId,
        targetId,
        action,
        actorId,
        snapshot: snapshot as Prisma.InputJsonValue,
        createdBy: actorId,
        updatedBy: actorId,
      },
    });
  }

  private async notifyAssignees(
    companyId: string,
    actorId: string,
    target: {
      id: string;
      title: string;
      assigneeIds: string[];
      endDate: Date;
      completedQuantity: number;
      quantity: number;
    },
    kind: "assigned" | "updated" | "progress" | "completed"
  ) {
    const users = await this.prisma.user.findMany({
      where: {
        companyId,
        employeeId: { in: target.assigneeIds },
        deletedAt: null,
        isActive: true,
      },
      select: { id: true },
    });
    if (users.length === 0) return;

    const keys: Record<typeof kind, { title: string; body: string; priority: "normal" | "high" | "urgent" }> = {
      assigned: {
        title: "notifications.targetAssignedTitle",
        body: "notifications.targetAssignedBody",
        priority: "normal",
      },
      updated: {
        title: "notifications.targetUpdatedTitle",
        body: "notifications.targetUpdatedBody",
        priority: "normal",
      },
      progress: {
        title: "notifications.targetProgressTitle",
        body: "notifications.targetProgressBody",
        priority: "normal",
      },
      completed: {
        title: "notifications.targetCompletedTitle",
        body: "notifications.targetCompletedBody",
        priority: "high",
      },
    };

    const cfg = keys[kind];
    await this.notifications.notifyDomain({
      companyId,
      actorId,
      category: "target",
      priority: cfg.priority,
      audience: "employee",
      titleKey: cfg.title,
      bodyKey: cfg.body,
      vars: {
        title: target.title,
        progress: `${Math.round((target.completedQuantity / Math.max(1, target.quantity)) * 100)}%`,
        deadline: dateOnly(target.endDate),
      },
      href: "/targets",
      entityType: "performance_target",
      entityId: target.id,
      recipientIds: users.map((u) => u.id),
    });
  }

  private async maybeDeadlineWarning(
    companyId: string,
    actorId: string,
    target: {
      id: string;
      title: string;
      assigneeIds: string[];
      endDate: Date;
      quantity: number;
      completedQuantity: number;
      status: TargetStatus;
    },
    metrics: ReturnType<typeof computeTargetProgress>
  ) {
    if (
      target.status === TargetStatus.completed ||
      target.status === TargetStatus.cancelled ||
      target.status === TargetStatus.archived
    ) {
      return;
    }

    const days = metrics.remainingDays;
    const milestones = [7, 3, 1, 0];
    if (!milestones.includes(days) && !(days < 0)) return;

    const users = await this.prisma.user.findMany({
      where: {
        companyId,
        employeeId: { in: target.assigneeIds },
        deletedAt: null,
        isActive: true,
      },
      select: { id: true },
    });

    const overdue = days < 0;
    await this.notifications.notifyDomain({
      companyId,
      actorId,
      category: "target",
      priority: overdue ? "urgent" : days <= 1 ? "high" : "normal",
      audience: "employee",
      titleKey: overdue
        ? "notifications.targetOverdueTitle"
        : "notifications.targetDeadlineTitle",
      bodyKey: overdue
        ? "notifications.targetOverdueBody"
        : "notifications.targetDeadlineBody",
      vars: {
        title: target.title,
        remaining: metrics.remaining,
        deadline: dateOnly(target.endDate),
        progress: `${metrics.percentage}%`,
        dailyRate: metrics.requiredDailyRate,
        risk: metrics.riskLevel,
        daysLeft: Math.max(0, days),
      },
      href: "/targets",
      entityType: "performance_target",
      entityId: target.id,
      recipientIds: users.map((u) => u.id),
    });
  }

  private buildTrend(
    targets: Array<{
      createdAt: string;
      status: string;
      updatedAt: string;
    }>
  ) {
    const days: Array<{ date: string; completed: number; created: number }> =
      [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ date: key, completed: 0, created: 0 });
    }
    const index = new Map(days.map((d, i) => [d.date, i]));
    for (const t of targets) {
      const created = t.createdAt.slice(0, 10);
      const ci = index.get(created);
      if (ci !== undefined) days[ci].created += 1;
      if (t.status === "completed") {
        const updated = t.updatedAt.slice(0, 10);
        const ui = index.get(updated);
        if (ui !== undefined) days[ui].completed += 1;
      }
    }
    return days;
  }

  private buildMonthlyTrend(
    targets: Array<{ performanceScore: number; updatedAt: string }>
  ) {
    const map = new Map<string, { sum: number; n: number }>();
    for (const t of targets) {
      const month = t.updatedAt.slice(0, 7);
      const cur = map.get(month) ?? { sum: 0, n: 0 };
      cur.sum += t.performanceScore;
      cur.n += 1;
      map.set(month, cur);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, v]) => ({
        month,
        score: Math.round((v.sum / v.n) * 10) / 10,
      }));
  }
}
