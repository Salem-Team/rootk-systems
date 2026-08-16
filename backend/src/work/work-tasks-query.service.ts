import { Injectable } from "@nestjs/common";
import { TaskPriority, TaskStatus, WorkOrigin, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { mapTask, type Actor } from "./work-mappers";
import { listDirectReportIds } from "../lib/team";
import { workTaskListScope } from "./work-access";

export type { Actor };

/** Read-side task queries extracted from `WorkTasksService`. */
@Injectable()
export class WorkTasksQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async listTasks(
    companyId: string,
    actor: Actor,
    filters: {
      employeeId?: string;
      status?: string;
      priority?: string;
      origin?: string;
      team?: string;
    } = {}
  ) {
    const where: Prisma.WorkTaskWhereInput = { companyId, deletedAt: null };
    if (filters.status) where.status = filters.status as TaskStatus;
    if (filters.priority) where.priority = filters.priority as TaskPriority;
    if (filters.origin) where.origin = filters.origin as WorkOrigin;
    const scope = workTaskListScope(actor);
    const teamView =
      actor.role === "employee" &&
      (filters.team === "true" || (scope === "managed" && !filters.employeeId));
    if (teamView) {
      const reportIds = await listDirectReportIds(
        this.prisma,
        companyId,
        actor.employeeId
      );
      const visibleIds = [actor.employeeId, ...reportIds].filter(Boolean);
      const createdByIds = [actor.userId, actor.employeeId].filter(
        (id, index, arr) => Boolean(id) && arr.indexOf(id) === index
      );
      where.OR = [
        ...(visibleIds.length > 0
          ? [{ assigneeIds: { hasSome: visibleIds } }]
          : []),
        ...createdByIds.map((id) => ({ createdBy: id })),
      ];
      if (!where.OR.length) return [];
    } else {
      const employeeId =
        actor.role === "employee" && scope === "own"
          ? actor.employeeId
          : filters.employeeId;
      if (employeeId) where.assigneeIds = { has: employeeId };
    }
    const rows = await this.prisma.workTask.findMany({
      where,
      orderBy: { dueDate: "asc" },
    });
    return rows.map((row) => mapTask(row, actor));
  }

  async taskById(companyId: string, actor: Actor, id: string) {
    const row = await this.prisma.workTask.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!row) return null;
    if (actor.role === "employee") {
      const scope = workTaskListScope(actor);
      if (scope === "own" && !row.assigneeIds.includes(actor.employeeId)) {
        return null;
      }
      if (scope === "managed") {
        const reportIds = await listDirectReportIds(
          this.prisma,
          companyId,
          actor.employeeId
        );
        const visible = new Set(
          [actor.employeeId, ...reportIds].filter(Boolean)
        );
        const visibleCreated = [actor.userId, actor.employeeId];
        const onTeam = row.assigneeIds.some((id) => visible.has(id));
        const createdByMe = Boolean(
          row.createdBy && visibleCreated.includes(row.createdBy)
        );
        if (!onTeam && !createdByMe) return null;
      }
    }
    return mapTask(row, actor);
  }
}
