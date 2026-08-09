import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { TaskPriority, TaskStatus, WorkOrigin, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { parseDate } from "../common/mappers";
import { NotificationsService } from "../notifications/notifications.service";
import {
  mapTask,
  ownsPersonalTask,
  sanitizeEvidenceLinks,
  type Actor,
} from "./work-mappers";

export type { Actor };

/** Task create/delete/sub-item flows extracted from `WorkTasksService`. */
@Injectable()
export class WorkTasksWriteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService
  ) {}

  async createTask(
    companyId: string,
    actor: Actor,
    body: Record<string, unknown>
  ) {
    const isEmployee = actor.role === "employee";
    const origin = isEmployee
      ? WorkOrigin.personal
      : ((body.origin as WorkOrigin) ?? WorkOrigin.assigned);
    const assigneeIds = isEmployee
      ? [actor.employeeId]
      : ((body.assigneeIds as string[]) ?? []);
    if (isEmployee && origin !== WorkOrigin.personal) {
      throw new ForbiddenException("Employees can only create personal tasks");
    }
    const requireEvidenceLinks = isEmployee
      ? false
      : Boolean(body.requireEvidenceLinks);
    const requireEvidenceNotes = isEmployee
      ? false
      : Boolean(body.requireEvidenceNotes);
    const row = await this.prisma.workTask.create({
      data: {
        companyId,
        title: String(body.title ?? ""),
        description: String(body.description ?? ""),
        status: (body.status as TaskStatus) ?? TaskStatus.todo,
        priority: (body.priority as TaskPriority) ?? TaskPriority.medium,
        dueDate: body.dueDate ? parseDate(String(body.dueDate)) : null,
        tag: String(body.tag ?? ""),
        estimateMin: Number(body.estimateMin ?? 0),
        assigneeIds,
        relatedMeetingId: (body.relatedMeetingId as string) ?? undefined,
        targetId: (body.targetId as string) ?? undefined,
        subItems: (body.subItems as object) ?? [],
        origin,
        requireEvidenceLinks,
        requireEvidenceNotes,
        evidenceLinks: sanitizeEvidenceLinks(body.evidenceLinks),
        evidenceNotes: String(body.evidenceNotes ?? ""),
        createdBy: actor.userId,
        updatedBy: actor.userId,
      },
    });

    if (origin === WorkOrigin.assigned && assigneeIds.length > 0) {
      const users = await this.prisma.user.findMany({
        where: {
          companyId,
          employeeId: { in: assigneeIds },
          deletedAt: null,
        },
      });
      await this.notifications.notifyDomain({
        companyId,
        actorId: actor.userId,
        category: "work",
        priority: "normal",
        audience: "employee",
        titleKey: "notifications.taskAssignedTitle",
        bodyKey: "notifications.taskAssignedBody",
        vars: { title: row.title },
        href: "/tasks",
        entityType: "work_task",
        entityId: row.id,
        recipientIds: users.map((u) => u.id),
      });
    }

    return mapTask(row);
  }

  async toggleSubItem(
    companyId: string,
    actor: Actor,
    id: string,
    subId: string
  ) {
    const current = await this.prisma.workTask.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!current) throw new NotFoundException("Task not found");
    if (
      actor.role === "employee" &&
      !current.assigneeIds.includes(actor.employeeId)
    ) {
      throw new ForbiddenException("You can only update tasks assigned to you");
    }
    const items = Array.isArray(current.subItems)
      ? [...(current.subItems as Array<Record<string, unknown>>)]
      : [];
    const next = items.map((s) =>
      s && s.id === subId ? { ...s, done: !s.done } : s
    );
    const row = await this.prisma.workTask.update({
      where: { id },
      data: {
        subItems: next as Prisma.InputJsonValue,
        updatedBy: actor.userId,
        version: { increment: 1 },
      },
    });
    return mapTask(row);
  }

  async deleteTask(companyId: string, actor: Actor, id: string) {
    const current = await this.prisma.workTask.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!current) throw new NotFoundException("Task not found");
    if (actor.role === "employee" && !ownsPersonalTask(current, actor)) {
      throw new ForbiddenException("You can only delete your personal tasks");
    }
    await this.prisma.workTask.update({
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
}
