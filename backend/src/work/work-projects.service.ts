import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, WorkProjectStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { auditFields, dateOnly } from "../common/mappers";
import type { Actor } from "./work-mappers";

const PROJECT_STATUSES = new Set<string>([
  "planning",
  "active",
  "on_hold",
  "completed",
]);
const PHASE_STATUSES = new Set(["upcoming", "active", "done"]);
const TASK_STATUSES = new Set(["todo", "in_progress", "completed"]);
const PRIORITIES = new Set(["high", "medium", "low"]);

type ProjectPhase = {
  id: string;
  name: string;
  description: string;
  status: string;
  startDate: string;
  endDate: string;
  tasks: ProjectTask[];
};

type ProjectTask = {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string;
  estimateMin: number;
  assigneeIds: string[];
  workTaskId: string;
};

function cleanDate(value: unknown): string {
  const text = String(value ?? "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function clip(value: unknown, max: number): string {
  return String(value ?? "").trim().slice(0, max);
}

function cleanAssigneeIds(
  raw: unknown,
  allowed: Set<string>,
  restrict: boolean
): string[] {
  if (!Array.isArray(raw)) return [];
  const ids = Array.from(
    new Set(raw.map((id) => String(id).trim()).filter(Boolean))
  );
  const picked = restrict ? ids.filter((id) => allowed.has(id)) : ids;
  return picked.slice(0, 20);
}

/** Lead, project member, or owner of a task inside the project. */
export function projectVisibleToEmployee(
  row: { leadId: string; memberIds: string[]; phases: unknown },
  employeeId: string
): boolean {
  if (!employeeId) return false;
  if (row.leadId === employeeId || row.memberIds.includes(employeeId)) return true;
  if (!Array.isArray(row.phases)) return false;
  return row.phases.some((phase) => {
    if (!phase || typeof phase !== "object") return false;
    const tasks = (phase as { tasks?: unknown }).tasks;
    if (!Array.isArray(tasks)) return false;
    return tasks.some((task) => {
      if (!task || typeof task !== "object") return false;
      const ids = (task as { assigneeIds?: unknown }).assigneeIds;
      return Array.isArray(ids) && ids.map(String).includes(employeeId);
    });
  });
}

export function sanitizeProjectPhases(
  raw: unknown,
  memberIds: string[],
  restrictAssignees = true
): ProjectPhase[] {
  if (!Array.isArray(raw)) return [];
  const allowed = new Set(memberIds);
  return raw.slice(0, 24).flatMap((item, phaseIndex) => {
    if (!item || typeof item !== "object") return [];
    const phase = item as Record<string, unknown>;
    const name = clip(phase.name, 120);
    if (!name) return [];
    const tasksRaw = Array.isArray(phase.tasks) ? phase.tasks : [];
    const tasks = tasksRaw.slice(0, 40).flatMap((taskItem, taskIndex) => {
      if (!taskItem || typeof taskItem !== "object") return [];
      const task = taskItem as Record<string, unknown>;
      const title = clip(task.title, 160);
      if (!title) return [];
      const assigneeIds = cleanAssigneeIds(task.assigneeIds, allowed, restrictAssignees);
      const estimate = Number(task.estimateMin);
      return [
        {
          id: clip(task.id, 40) || `pt_${phaseIndex}_${taskIndex}`,
          title,
          description: clip(task.description, 2000),
          status: TASK_STATUSES.has(String(task.status))
            ? String(task.status)
            : "todo",
          priority: PRIORITIES.has(String(task.priority))
            ? String(task.priority)
            : "medium",
          dueDate: cleanDate(task.dueDate),
          estimateMin:
            Number.isFinite(estimate) && estimate > 0
              ? Math.min(Math.round(estimate), 100000)
              : 0,
          assigneeIds,
          workTaskId: clip(task.workTaskId, 80),
        },
      ];
    });
    const range = orderRange(cleanDate(phase.startDate), cleanDate(phase.endDate));
    const startDate = range.start;
    const endDate = range.end;
    return [
      {
        id: clip(phase.id, 40) || `ph_${phaseIndex}`,
        name,
        description: clip(phase.description, 2000),
        status: PHASE_STATUSES.has(String(phase.status))
          ? String(phase.status)
          : "upcoming",
        startDate,
        endDate,
        tasks,
      },
    ];
  });
}

/** Calendar dates are stored as UTC midnight so read-back does not shift a day. */
export function projectCalendarDate(value: unknown): Date | null {
  const text = cleanDate(value);
  if (!text) return null;
  return new Date(`${text}T00:00:00.000Z`);
}

function assertPhasePayload(raw: unknown) {
  if (!Array.isArray(raw)) return;
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const phase = item as Record<string, unknown>;
    const name = clip(phase.name, 120);
    const tasks = Array.isArray(phase.tasks) ? phase.tasks : [];
    const hasTitledTask = tasks.some(
      (task) =>
        task &&
        typeof task === "object" &&
        clip((task as Record<string, unknown>).title, 160)
    );
    if (!name && hasTitledTask) {
      throw new BadRequestException("Name every phase that has tasks");
    }
  }
}

function orderRange(start: string, end: string) {
  if (start && end && end < start) return { start: end, end: start };
  return { start, end };
}

@Injectable()
export class WorkProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async listProjects(companyId: string, actor: Actor) {
    const rows = await this.prisma.workProject.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { updatedAt: "desc" },
    });
    const visible = this.canSeeEveryProject(actor)
      ? rows
      : await this.projectsVisibleToEmployee(companyId, actor.employeeId, rows);
    return visible.map((row) => this.mapProject(row));
  }

  async createProject(
    companyId: string,
    actor: Actor,
    body: Record<string, unknown>
  ) {
    this.assertCanManage(actor);
    const data = this.readPayload(body);
    const row = await this.prisma.workProject.create({
      data: {
        companyId,
        ...data,
        phases: data.phases as unknown as Prisma.InputJsonValue,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      },
    });
    return this.mapProject(row);
  }

  async updateProject(
    companyId: string,
    actor: Actor,
    id: string,
    body: Record<string, unknown>
  ) {
    this.assertCanManage(actor);
    const current = await this.prisma.workProject.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!current) throw new NotFoundException("Project not found");
    const data = this.readPayload(body);
    const row = await this.prisma.workProject.update({
      where: { id },
      data: {
        ...data,
        phases: data.phases as unknown as Prisma.InputJsonValue,
        updatedBy: actor.userId,
        version: { increment: 1 },
      },
    });
    return this.mapProject(row);
  }

  async deleteProject(companyId: string, actor: Actor, id: string) {
    this.assertCanManage(actor);
    const current = await this.prisma.workProject.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!current) throw new NotFoundException("Project not found");
    await this.prisma.workProject.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isArchived: true,
        updatedBy: actor.userId,
        version: { increment: 1 },
      },
    });
    return true;
  }

  private async projectsVisibleToEmployee<T extends { id: string; leadId: string; memberIds: string[]; phases: unknown }>(
    companyId: string,
    employeeId: string,
    rows: T[]
  ) {
    const linked = await this.prisma.workTask.findMany({
      where: {
        companyId,
        deletedAt: null,
        projectId: { not: null },
        assigneeIds: { has: employeeId },
      },
      select: { projectId: true },
    });
    const assignedProjectIds = new Set(
      linked.map((task) => task.projectId).filter((id): id is string => Boolean(id))
    );
    return rows.filter(
      (row) =>
        projectVisibleToEmployee(row, employeeId) || assignedProjectIds.has(row.id)
    );
  }

  private canSeeEveryProject(actor: Actor) {
    if (actor.role !== "employee") return true;
    const permissions = actor.permissions ?? [];
    return (
      permissions.includes("tasks.viewAll") ||
      permissions.includes("tasks.assign")
    );
  }

  private assertCanManage(actor: Actor) {
    if (actor.role !== "employee") return;
    const permissions = actor.permissions ?? [];
    if (
      permissions.includes("tasks.assign") ||
      permissions.includes("tasks.editOthers")
    ) {
      return;
    }
    throw new ForbiddenException("Only managers can edit projects");
  }

  private readPayload(body: Record<string, unknown>) {
    const name = clip(body.name, 160);
    const leadId = clip(body.leadId, 80);
    if (!name || !leadId) {
      throw new BadRequestException("Project name and lead are required");
    }
    const range = orderRange(cleanDate(body.startDate), cleanDate(body.endDate));
    const startDate = range.start;
    const endDate = range.end;
    assertPhasePayload(body.phases);
    const memberIds = Array.from(
      new Set(
        [leadId, ...(Array.isArray(body.memberIds) ? body.memberIds : [])]
          .map((id) => String(id).trim())
          .filter(Boolean)
      )
    ).slice(0, 80);
    const status = PROJECT_STATUSES.has(String(body.status))
      ? (String(body.status) as WorkProjectStatus)
      : WorkProjectStatus.planning;
    return {
      name,
      description: clip(body.description, 4000),
      status,
      startDate: projectCalendarDate(startDate),
      endDate: projectCalendarDate(endDate),
      leadId,
      memberIds,
      phases: sanitizeProjectPhases(body.phases, memberIds),
    };
  }

  private mapProject(row: {
    id: string;
    name: string;
    description: string;
    status: WorkProjectStatus;
    startDate: Date | null;
    endDate: Date | null;
    leadId: string;
    memberIds: string[];
    phases: Prisma.JsonValue;
    companyId: string;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string | null;
    updatedBy: string | null;
    deletedAt: Date | null;
    isArchived: boolean;
    version: number;
    metadata: Prisma.JsonValue;
  }) {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      status: row.status,
      startDate: row.startDate ? dateOnly(row.startDate) : "",
      endDate: row.endDate ? dateOnly(row.endDate) : "",
      leadId: row.leadId,
      memberIds: row.memberIds,
      phases: sanitizeProjectPhases(row.phases, row.memberIds, false),
      ...auditFields(row),
    };
  }
}
