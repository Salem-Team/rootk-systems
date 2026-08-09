/** History + notification side-effects shared by the target CRUD/progress services. */
import { Injectable } from "@nestjs/common";
import { Prisma, TargetStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { dateOnly } from "../common/mappers";
import type { computeTargetProgress } from "../lib/target-progress";

@Injectable()
export class TargetsNotifyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService
  ) {}

  async writeHistory(
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

  async notifyLinkedTasksCreated(
    companyId: string,
    actorId: string,
    target: { id: string; title: string; assigneeIds: string[] },
    taskCount: number
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

    await this.notifications.notifyDomain({
      companyId,
      actorId,
      category: "work",
      priority: "normal",
      audience: "employee",
      titleKey: "notifications.targetTasksReadyTitle",
      bodyKey: "notifications.targetTasksReadyBody",
      vars: {
        title: target.title,
        count: taskCount,
      },
      href: "/tasks",
      entityType: "performance_target",
      entityId: target.id,
      recipientIds: users.map((u) => u.id),
    });
  }

  async notifyAssignees(
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

  async maybeDeadlineWarning(
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
}
