import { Injectable } from "@nestjs/common";
import { TaskPriority, TaskStatus, WorkOrigin, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { mapTask, type Actor } from "./work-mappers";
import { listDirectReportIds } from "../lib/team";
import { workTaskListScope } from "./work-access";
import {
  actorCanSeeWorkTask,
  workTaskVisibilityOr,
} from "./work-task-visibility";

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
    const visibilityOr = await workTaskVisibilityOr(
      this.prisma,
      companyId,
      actor,
      scope
    );

    // Optional narrow-to-one employee — still must stay inside visibility.
    const requestedEmployeeId = filters.employeeId?.trim() || "";
    if (requestedEmployeeId) {
      if (visibilityOr === null) {
        where.assigneeIds = { has: requestedEmployeeId };
      } else {
        where.AND = [
          { OR: visibilityOr },
          { assigneeIds: { has: requestedEmployeeId } },
        ];
      }
    } else if (visibilityOr) {
      if (visibilityOr.length === 0) return [];
      where.OR = visibilityOr;
    }

    const rows = await this.prisma.workTask.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });

    const revealAssignees =
      scope !== "own" ||
      Boolean(filters.team === "true") ||
      visibilityOr === null;

    return rows.map((row) =>
      mapTask(row, actor, { revealAssignees })
    );
  }

  async taskById(companyId: string, actor: Actor, id: string) {
    const row = await this.prisma.workTask.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!row) return null;

    const allowed = await actorCanSeeWorkTask(
      this.prisma,
      companyId,
      actor,
      row
    );
    if (!allowed) return null;

    const scope = workTaskListScope(actor);
    const reportIds =
      scope !== "all" && actor.employeeId
        ? await listDirectReportIds(this.prisma, companyId, actor.employeeId)
        : [];
    const supervisingReport = row.assigneeIds.some((id) =>
      reportIds.includes(id)
    );
    return mapTask(row, actor, {
      revealAssignees: scope !== "own" || supervisingReport,
    });
  }
}
