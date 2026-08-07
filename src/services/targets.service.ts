import {
  deleteTarget as apiDeleteTarget,
  deleteTargetCategory as apiDeleteCategory,
  deleteTargetTemplate as apiDeleteTemplate,
  deleteTargetType as apiDeleteType,
  fetchDelayedCenter,
  fetchEmployeeTargetPerformance,
  fetchTargetById,
  fetchTargetCategories,
  fetchTargetDashboard,
  fetchTargetTemplates,
  fetchTargetTypes,
  fetchTargetWarnings,
  fetchTargets,
  patchAcknowledgeWarning,
  patchTarget,
  postTarget,
  postTargetWarning,
  putTargetCategory,
  putTargetTemplate,
  putTargetType,
} from "@/api/targets.api";
import { isApiMode } from "@/lib/env";
import { enrichWithAudit, touchEntity } from "@/lib/entity";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { createId } from "@/lib/id";
import { canTarget } from "@/lib/target-policies";
import {
  buildTaskTitle,
  computeTargetProgress,
  MAX_AUTO_TASKS_PER_TARGET,
} from "@/lib/target-progress";
import {
  performanceTargetRepository,
  targetCategoryRepository,
  targetHistoryRepository,
  targetTemplateRepository,
  targetTypeRepository,
  targetWarningRepository,
  workTaskRepository,
} from "@/repositories";
import {
  assignTargetSchema,
  targetCategorySchema,
  targetTemplateSchema,
  targetTypeSchema,
  targetWarningSchema,
  type AssignTargetInput,
  type TargetCategoryInput,
  type TargetTemplateInput,
  type TargetTypeInput,
  type TargetWarningInput,
} from "@/schemas/targets.schema";
import { fail, fromError, ok } from "@/services/api-result";
import { emitTargetsUpdated } from "@/lib/events";
import {
  getSessionRole,
  getSessionUserId,
  getWorkEmployeeId,
} from "@/stores/session-store";
import type {
  ApiResponse,
  EmployeeTargetPerformance,
  PerformanceTarget,
  TargetCategory,
  TargetDashboardStats,
  TargetFilters,
  TargetHistoryEvent,
  TargetTemplate,
  TargetType,
  TargetWarning,
  WorkTask,
} from "@/types";

async function notifyQuietly(
  fn: () => Promise<unknown>
): Promise<void> {
  try {
    await fn();
  } catch {
    /* domain notifications must never break core flows */
  }
}

function withMetrics(target: PerformanceTarget): PerformanceTarget {
  const metrics = computeTargetProgress({
    quantity: target.quantity,
    completedQuantity: target.completedQuantity,
    startDate: target.startDate,
    endDate: target.endDate,
    status: target.status,
  });
  return { ...target, metrics, performanceScore: metrics.performanceScore };
}

function assertCap(capability: Parameters<typeof canTarget>[1]) {
  const role = getSessionRole();
  if (!canTarget(role, capability)) {
    throw new ForbiddenError("Insufficient target permissions");
  }
}

function scopeTargets(
  items: PerformanceTarget[],
  filters: TargetFilters
): PerformanceTarget[] {
  const role = getSessionRole();
  let list = items.map(withMetrics);

  if (role === "employee") {
    const empId = getWorkEmployeeId();
    list = list.filter((t) => t.assigneeIds.includes(empId));
  } else if (filters.employeeId) {
    list = list.filter((t) => t.assigneeIds.includes(filters.employeeId!));
  }

  if (filters.department)
    list = list.filter((t) => t.department === filters.department);
  if (filters.branch) list = list.filter((t) => t.branch === filters.branch);
  if (filters.categoryId)
    list = list.filter((t) => t.categoryId === filters.categoryId);
  if (filters.typeId) list = list.filter((t) => t.typeId === filters.typeId);
  if (filters.priority)
    list = list.filter((t) => t.priority === filters.priority);
  if (filters.status) list = list.filter((t) => t.status === filters.status);
  if (filters.riskLevel)
    list = list.filter((t) => t.riskLevel === filters.riskLevel);
  if (filters.delayedOnly)
    list = list.filter((t) => t.status === "delayed");
  if (filters.completedOnly)
    list = list.filter((t) => t.status === "completed");
  if (filters.search) {
    const q = filters.search.toLowerCase();
    list = list.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.notes.toLowerCase().includes(q)
    );
  }
  if (filters.minProgress != null)
    list = list.filter(
      (t) => (t.metrics?.percentage ?? 0) >= filters.minProgress!
    );
  if (filters.maxProgress != null)
    list = list.filter(
      (t) => (t.metrics?.percentage ?? 0) <= filters.maxProgress!
    );

  return list.sort((a, b) => a.endDate.localeCompare(b.endDate));
}

async function writeHistory(
  targetId: string,
  action: string,
  snapshot: Record<string, unknown>
) {
  const actorId = getSessionUserId();
  const event: TargetHistoryEvent = enrichWithAudit(
    {
      id: createId("th"),
      targetId,
      action,
      actorId,
      note: "",
      snapshot,
    },
    actorId
  );
  await targetHistoryRepository.create(event);
}

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

// ── Categories ────────────────────────────────────────────────────────────

export async function getTargetCategories(): Promise<
  ApiResponse<TargetCategory[]>
> {
  if (isApiMode()) return fetchTargetCategories();
  try {
    const rows = await targetCategoryRepository.findAll();
    return ok(
      rows.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    );
  } catch (error) {
    return fromError(error, []);
  }
}

export async function saveTargetCategory(
  input: TargetCategoryInput
): Promise<ApiResponse<TargetCategory>> {
  if (isApiMode()) return putTargetCategory(input);
  try {
    assertCap("manage_categories");
    const parsed = targetCategorySchema.parse(input);
    const actorId = getSessionUserId();
    if (parsed.id) {
      const current = await targetCategoryRepository.findById(parsed.id);
      if (!current) throw new NotFoundError("Category not found");
      const next = touchEntity(current, actorId, parsed);
      await targetCategoryRepository.update(parsed.id, next);
      return ok(next);
    }
    const row = enrichWithAudit(
      {
        id: createId("tcat"),
        name: parsed.name,
        color: parsed.color,
        icon: parsed.icon,
        description: parsed.description,
        active: parsed.active,
        sortOrder: parsed.sortOrder,
      },
      actorId
    );
    await targetCategoryRepository.create(row);
    return ok(row);
  } catch (error) {
    return fromError(error, {
      id: "",
      name: "",
      color: "#082868",
      icon: "Target",
      description: "",
      active: true,
      sortOrder: 0,
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

export async function removeTargetCategory(
  id: string
): Promise<ApiResponse<{ ok: boolean }>> {
  if (isApiMode()) return apiDeleteCategory(id);
  try {
    assertCap("manage_categories");
    await targetCategoryRepository.delete(id);
    return ok({ ok: true });
  } catch (error) {
    return fromError(error, { ok: false });
  }
}

// ── Types ─────────────────────────────────────────────────────────────────

export async function getTargetTypes(
  categoryId?: string
): Promise<ApiResponse<TargetType[]>> {
  if (isApiMode()) return fetchTargetTypes(categoryId);
  try {
    const rows = await targetTypeRepository.findAll();
    const filtered = categoryId
      ? rows.filter((t) => t.categoryId === categoryId)
      : rows;
    return ok(
      filtered.sort(
        (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
      )
    );
  } catch (error) {
    return fromError(error, []);
  }
}

export async function saveTargetType(
  input: TargetTypeInput
): Promise<ApiResponse<TargetType>> {
  if (isApiMode()) return putTargetType(input);
  try {
    assertCap("manage_types");
    const parsed = targetTypeSchema.parse(input);
    const actorId = getSessionUserId();
    if (parsed.id) {
      const current = await targetTypeRepository.findById(parsed.id);
      if (!current) throw new NotFoundError("Type not found");
      const next = touchEntity(current, actorId, parsed);
      await targetTypeRepository.update(parsed.id, next);
      return ok(next);
    }
    const row = enrichWithAudit(
      {
        id: createId("ttype"),
        categoryId: parsed.categoryId,
        name: parsed.name,
        description: parsed.description,
        unit: parsed.unit,
        taskTitleTemplate: parsed.taskTitleTemplate,
        active: parsed.active,
        sortOrder: parsed.sortOrder,
      },
      actorId
    );
    await targetTypeRepository.create(row);
    return ok(row);
  } catch (error) {
    return fromError(error, {
      id: "",
      categoryId: "",
      name: "",
      description: "",
      unit: "unit",
      taskTitleTemplate: "{name} #{n}",
      active: true,
      sortOrder: 0,
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

export async function removeTargetType(
  id: string
): Promise<ApiResponse<{ ok: boolean }>> {
  if (isApiMode()) return apiDeleteType(id);
  try {
    assertCap("manage_types");
    await targetTypeRepository.delete(id);
    return ok({ ok: true });
  } catch (error) {
    return fromError(error, { ok: false });
  }
}

// ── Templates ─────────────────────────────────────────────────────────────

export async function getTargetTemplates(): Promise<
  ApiResponse<TargetTemplate[]>
> {
  if (isApiMode()) return fetchTargetTemplates();
  try {
    return ok(await targetTemplateRepository.findAll());
  } catch (error) {
    return fromError(error, []);
  }
}

export async function saveTargetTemplate(
  input: TargetTemplateInput
): Promise<ApiResponse<TargetTemplate>> {
  if (isApiMode()) return putTargetTemplate(input);
  try {
    assertCap("manage_templates");
    const parsed = targetTemplateSchema.parse(input);
    const actorId = getSessionUserId();
    const items = parsed.items.map((item, index) => ({
      id: item.id ?? createId("tti"),
      companyId: "",
      templateId: parsed.id ?? "",
      typeId: item.typeId,
      quantity: item.quantity,
      unit: item.unit,
      weight: item.weight,
      sortOrder: item.sortOrder ?? index,
    }));

    if (parsed.id) {
      const current = await targetTemplateRepository.findById(parsed.id);
      if (!current) throw new NotFoundError("Template not found");
      const next = touchEntity(current, actorId, {
        name: parsed.name,
        description: parsed.description,
        categoryId: parsed.categoryId ?? null,
        active: parsed.active,
        items: items.map((i) => ({ ...i, templateId: parsed.id! })),
      });
      await targetTemplateRepository.update(parsed.id, next);
      return ok(next);
    }

    const id = createId("ttpl");
    const row = enrichWithAudit(
      {
        id,
        name: parsed.name,
        description: parsed.description,
        categoryId: parsed.categoryId ?? null,
        active: parsed.active,
        items: items.map((i) => ({ ...i, templateId: id })),
      },
      actorId
    );
    await targetTemplateRepository.create(row);
    return ok(row);
  } catch (error) {
    return fromError(error, {
      id: "",
      categoryId: null,
      name: "",
      description: "",
      active: true,
      items: [],
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

export async function removeTargetTemplate(
  id: string
): Promise<ApiResponse<{ ok: boolean }>> {
  if (isApiMode()) return apiDeleteTemplate(id);
  try {
    assertCap("manage_templates");
    await targetTemplateRepository.delete(id);
    return ok({ ok: true });
  } catch (error) {
    return fromError(error, { ok: false });
  }
}

// ── Targets ───────────────────────────────────────────────────────────────

export async function getTargets(
  filters: TargetFilters = {}
): Promise<ApiResponse<PerformanceTarget[]>> {
  if (isApiMode()) return fetchTargets(filters);
  try {
    const rows = await performanceTargetRepository.findAll();
    return ok(scopeTargets(rows, filters));
  } catch (error) {
    return fromError(error, []);
  }
}

export async function getTarget(
  id: string
): Promise<ApiResponse<PerformanceTarget | null>> {
  if (isApiMode()) return fetchTargetById(id);
  try {
    const row = await performanceTargetRepository.findById(id);
    if (!row) return ok(null);
    const scoped = scopeTargets([row], {});
    return ok(scoped[0] ?? null);
  } catch (error) {
    return fromError(error, null);
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

// ── Dashboard / delayed / warnings / employee ─────────────────────────────

export async function getTargetDashboard(): Promise<
  ApiResponse<TargetDashboardStats>
> {
  if (isApiMode()) return fetchTargetDashboard();
  try {
    const [targetsRes, catsRes] = await Promise.all([
      getTargets(),
      getTargetCategories(),
    ]);
    const targets = targetsRes.data;
    const categories = catsRes.data;
    const catMap = new Map(categories.map((c) => [c.id, c]));

    const total = targets.length;
    const completed = targets.filter((t) => t.status === "completed").length;
    const delayed = targets.filter((t) => t.status === "delayed").length;
    const critical = targets.filter(
      (t) => t.priority === "critical" || t.riskLevel === "critical"
    ).length;
    const inProgress = targets.filter((t) =>
      ["in_progress", "on_track", "behind_schedule", "assigned"].includes(
        t.status
      )
    ).length;
    const scores = targets.map((t) => t.performanceScore);
    const averagePerformance =
      scores.length === 0
        ? 0
        : Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) /
          10;

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

    const byCategoryMap = new Map<
      string,
      { id: string; name: string; color: string; count: number }
    >();
    for (const t of targets) {
      const cat = catMap.get(t.categoryId);
      const cur = byCategoryMap.get(t.categoryId) ?? {
        id: t.categoryId,
        name: cat?.name ?? "—",
        color: cat?.color ?? "#082868",
        count: 0,
      };
      cur.count += 1;
      byCategoryMap.set(t.categoryId, cur);
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

    const now = new Date();
    const completionTrend = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - (13 - i));
      const date = d.toISOString().slice(0, 10);
      return {
        date,
        created: targets.filter((t) => t.createdAt.slice(0, 10) === date).length,
        completed: targets.filter(
          (t) =>
            t.status === "completed" && t.updatedAt.slice(0, 10) === date
        ).length,
      };
    });

    return ok({
      total,
      completed,
      inProgress,
      delayed,
      critical,
      completionRate:
        total === 0 ? 0 : Math.round((completed / total) * 1000) / 10,
      averagePerformance,
      employeesAtRisk: ranked.filter((e) => e.score < 50).length,
      upcomingDeadlines: targets.filter(
        (t) =>
          (t.metrics?.remainingDays ?? 99) <= 7 &&
          t.status !== "completed" &&
          t.status !== "cancelled"
      ).length,
      byCategory: [...byCategoryMap.values()],
      byStatus: [...statusCounts.entries()].map(([status, count]) => ({
        status: status as PerformanceTarget["status"],
        count,
      })),
      byDepartment: [...deptMap.values()].map((d) => ({
        department: d.department,
        count: d.count,
        avgScore: Math.round((d.scoreSum / d.count) * 10) / 10,
      })),
      topPerformers: ranked.slice(0, 5),
      bottomPerformers: ranked.slice(-5).reverse(),
      completionTrend,
    });
  } catch (error) {
    return fromError(error, {
      total: 0,
      completed: 0,
      inProgress: 0,
      delayed: 0,
      critical: 0,
      completionRate: 0,
      averagePerformance: 0,
      employeesAtRisk: 0,
      upcomingDeadlines: 0,
      byCategory: [],
      byStatus: [],
      byDepartment: [],
      topPerformers: [],
      bottomPerformers: [],
      completionTrend: [],
    });
  }
}

export async function getDelayedCenter(): Promise<
  ApiResponse<{
    delayedTargets: PerformanceTarget[];
    criticalTargets: PerformanceTarget[];
    highRiskTargets: PerformanceTarget[];
    delayedTasks: WorkTask[];
  }>
> {
  if (isApiMode()) {
    const res = await fetchDelayedCenter();
    return {
      ...res,
      data: {
        ...res.data,
        delayedTasks: res.data.delayedTasks as unknown as WorkTask[],
      },
    };
  }
  try {
    const targetsRes = await getTargets();
    const targets = targetsRes.data;
    const delayedTargets = targets.filter(
      (t) =>
        t.status === "delayed" ||
        t.riskLevel === "critical" ||
        t.riskLevel === "high" ||
        t.health === "critical" ||
        t.health === "delayed"
    );
    const tasks = await workTaskRepository.findAll();
    const today = new Date().toISOString().slice(0, 10);
    const role = getSessionRole();
    const empId = getWorkEmployeeId();
    let delayedTasks = tasks.filter(
      (t) =>
        (t.dueDate && t.dueDate < today && t.status !== "completed") ||
        (t.targetId && delayedTargets.some((dt) => dt.id === t.targetId))
    );
    if (role === "employee") {
      delayedTasks = delayedTasks.filter((t) => t.assigneeIds.includes(empId));
    }
    return ok({
      delayedTargets,
      criticalTargets: targets.filter(
        (t) => t.priority === "critical" || t.riskLevel === "critical"
      ),
      highRiskTargets: targets.filter((t) => t.riskLevel === "high"),
      delayedTasks,
    });
  } catch (error) {
    return fromError(error, {
      delayedTargets: [],
      criticalTargets: [],
      highRiskTargets: [],
      delayedTasks: [],
    });
  }
}

export async function getTargetWarnings(filters: {
  targetId?: string;
  employeeId?: string;
} = {}): Promise<ApiResponse<TargetWarning[]>> {
  if (isApiMode()) return fetchTargetWarnings(filters);
  try {
    let rows = await targetWarningRepository.findAll();
    const role = getSessionRole();
    if (role === "employee") {
      rows = rows.filter((w) => w.employeeId === getWorkEmployeeId());
    } else if (filters.employeeId) {
      rows = rows.filter((w) => w.employeeId === filters.employeeId);
    }
    if (filters.targetId) {
      rows = rows.filter((w) => w.targetId === filters.targetId);
    }
    return ok(rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  } catch (error) {
    return fromError(error, []);
  }
}

export async function sendTargetWarning(
  input: TargetWarningInput
): Promise<ApiResponse<TargetWarning>> {
  if (isApiMode()) return postTargetWarning(input);
  try {
    assertCap("send_warnings");
    const parsed = targetWarningSchema.parse(input);
    const target = await performanceTargetRepository.findById(parsed.targetId);
    if (!target) throw new NotFoundError("Target not found");
    const actorId = getSessionUserId();
    const row = enrichWithAudit(
      {
        id: createId("tw"),
        targetId: parsed.targetId,
        employeeId: parsed.employeeId,
        reason: parsed.reason,
        managerNotes: parsed.managerNotes,
        requiredAction: parsed.requiredAction,
        penaltyType: parsed.penaltyType,
        penaltyNote: parsed.penaltyNote,
        acknowledgedAt: null,
        acknowledgedBy: null,
      },
      actorId
    );
    await targetWarningRepository.create(row);
    await writeHistory(parsed.targetId, "warning", {
      warningId: row.id,
      penaltyType: row.penaltyType,
    });
    await notifyQuietly(async () => {
      const { notifyTargetWarning } = await import(
        "@/services/notification.service"
      );
      await notifyTargetWarning(target, row);
    });
    return ok(row);
  } catch (error) {
    return fromError(error, {
      id: "",
      targetId: "",
      employeeId: "",
      reason: "",
      managerNotes: "",
      requiredAction: "",
      penaltyType: "written_warning",
      penaltyNote: "",
      acknowledgedAt: null,
      acknowledgedBy: null,
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

export async function acknowledgeTargetWarning(
  id: string
): Promise<ApiResponse<TargetWarning>> {
  if (isApiMode()) return patchAcknowledgeWarning(id);
  try {
    const current = await targetWarningRepository.findById(id);
    if (!current) throw new NotFoundError("Warning not found");
    const role = getSessionRole();
    if (role === "employee" && current.employeeId !== getWorkEmployeeId()) {
      throw new ForbiddenError("Not your warning");
    }
    const next = touchEntity(current, getSessionUserId(), {
      acknowledgedAt: new Date().toISOString(),
      acknowledgedBy: getSessionUserId(),
    });
    await targetWarningRepository.update(id, next);
    return ok(next);
  } catch (error) {
    return fromError(error, {
      id,
      targetId: "",
      employeeId: "",
      reason: "",
      managerNotes: "",
      requiredAction: "",
      penaltyType: "written_warning",
      penaltyNote: "",
      acknowledgedAt: null,
      acknowledgedBy: null,
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

export async function getEmployeeTargetPerformance(
  employeeId: string
): Promise<ApiResponse<EmployeeTargetPerformance>> {
  if (isApiMode()) return fetchEmployeeTargetPerformance(employeeId);
  try {
    const role = getSessionRole();
    if (role === "employee" && employeeId !== getWorkEmployeeId()) {
      return fail(
        {
          employeeId,
          overallScore: 0,
          currentTargets: 0,
          completed: 0,
          remaining: 0,
          warnings: 0,
          delayedTasks: 0,
          monthlyTrend: [],
          targets: [],
        },
        "Not allowed",
        "FORBIDDEN"
      );
    }
    const [targetsRes, warningsRes] = await Promise.all([
      getTargets({ employeeId }),
      getTargetWarnings({ employeeId }),
    ]);
    const targets = targetsRes.data;
    const scores = targets.map((t) => t.performanceScore);
    const overallScore =
      scores.length === 0
        ? 0
        : Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) /
          10;
    const tasks = await workTaskRepository.findAll();
    const today = new Date().toISOString().slice(0, 10);
    const delayedTasks = tasks.filter(
      (t) =>
        t.assigneeIds.includes(employeeId) &&
        t.status !== "completed" &&
        t.dueDate &&
        t.dueDate < today
    ).length;

    const monthMap = new Map<string, { sum: number; n: number }>();
    for (const t of targets) {
      const month = t.updatedAt.slice(0, 7);
      const cur = monthMap.get(month) ?? { sum: 0, n: 0 };
      cur.sum += t.performanceScore;
      cur.n += 1;
      monthMap.set(month, cur);
    }

    return ok({
      employeeId,
      overallScore,
      currentTargets: targets.filter(
        (t) => t.status !== "completed" && t.status !== "cancelled"
      ).length,
      completed: targets.filter((t) => t.status === "completed").length,
      remaining: targets
        .map((t) => t.metrics?.remaining ?? 0)
        .reduce((a, b) => a + b, 0),
      warnings: warningsRes.data.length,
      delayedTasks,
      monthlyTrend: [...monthMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([month, v]) => ({
          month,
          score: Math.round((v.sum / v.n) * 10) / 10,
        })),
      targets,
    });
  } catch (error) {
    return fromError(error, {
      employeeId,
      overallScore: 0,
      currentTargets: 0,
      completed: 0,
      remaining: 0,
      warnings: 0,
      delayedTasks: 0,
      monthlyTrend: [],
      targets: [],
    });
  }
}

export async function exportTargetsCsv(
  filters: TargetFilters = {}
): Promise<ApiResponse<string>> {
  try {
    assertCap("export");
    const res = await getTargets(filters);
    if (!res.success) return fail("", res.message ?? "Failed", "EXPORT_FAILED");
    const header = [
      "title",
      "status",
      "priority",
      "quantity",
      "completed",
      "progress",
      "performance",
      "startDate",
      "endDate",
      "risk",
      "health",
    ].join(",");
    const lines = res.data.map((t) =>
      [
        JSON.stringify(t.title),
        t.status,
        t.priority,
        t.quantity,
        t.completedQuantity,
        t.metrics?.percentage ?? 0,
        t.performanceScore,
        t.startDate,
        t.endDate,
        t.riskLevel,
        t.health,
      ].join(",")
    );
    return ok([header, ...lines].join("\n"));
  } catch (error) {
    return fromError(error, "");
  }
}
