import { Injectable } from "@nestjs/common";
import { TaskPriority, TaskStatus, WorkOrigin, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { mapTask, type Actor } from "./work-mappers";

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
    } = {}
  ) {
    const where: Prisma.WorkTaskWhereInput = { companyId, deletedAt: null };
    if (filters.status) where.status = filters.status as TaskStatus;
    if (filters.priority) where.priority = filters.priority as TaskPriority;
    if (filters.origin) where.origin = filters.origin as WorkOrigin;
    const employeeId =
      actor.role === "employee" ? actor.employeeId : filters.employeeId;
    if (employeeId) where.assigneeIds = { has: employeeId };
    const rows = await this.prisma.workTask.findMany({
      where,
      orderBy: { dueDate: "asc" },
    });
    return rows.map(mapTask);
  }

  async taskById(companyId: string, actor: Actor, id: string) {
    const row = await this.prisma.workTask.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!row) return null;
    if (
      actor.role === "employee" &&
      !row.assigneeIds.includes(actor.employeeId)
    ) {
      return null;
    }
    return mapTask(row);
  }
}
