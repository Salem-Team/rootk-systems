import { Injectable, NotFoundException } from "@nestjs/common";
import { TargetHealth, TargetPriority, TargetRiskLevel, TargetStatus, TaskStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { iso, parseDate, parseDateEnd } from "../common/mappers";
import { computeTargetProgress } from "../lib/target-progress";
import { assertCap, type Actor } from "./targets-access";
import { mapTarget } from "./targets-mappers";
import { TargetsNotifyService } from "./targets-notify.service";

@Injectable()
export class TargetsProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notify: TargetsNotifyService
  ) {}

  async updateTarget(
    companyId: string,
    actor: Actor,
    id: string,
    body: Record<string, unknown>
  ) {
    assertCap(actor, "edit");
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
            ? parseDateEnd(String(body.endDate))
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

    await this.notify.writeHistory(companyId, id, actor.userId, "updated", body);
    await this.notify.notifyAssignees(companyId, actor.userId, row, "updated");
    return this.recalculateTarget(companyId, id, actor.userId);
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
      startDate: iso(target.startDate),
      endDate: iso(target.endDate),
      status: target.status,
    });

    const prevCompleted = target.completedQuantity;
    const nextStatus = metrics.derivedStatus as TargetStatus;
    const timingPatch: {
      assignedAt?: Date;
      completedAt?: Date | null;
    } = {};
    if (!target.assignedAt && nextStatus !== TargetStatus.draft) {
      timingPatch.assignedAt = new Date();
    }
    if (
      nextStatus === TargetStatus.completed &&
      target.status !== TargetStatus.completed
    ) {
      timingPatch.completedAt = new Date();
    } else if (
      nextStatus !== TargetStatus.completed &&
      target.status === TargetStatus.completed
    ) {
      timingPatch.completedAt = null;
    }

    const row = await this.prisma.performanceTarget.update({
      where: { id: targetId },
      data: {
        completedQuantity: completedCount,
        status: nextStatus,
        health: metrics.health as TargetHealth,
        riskLevel: metrics.riskLevel as TargetRiskLevel,
        performanceScore: metrics.performanceScore,
        ...timingPatch,
        updatedBy: actorId,
        version: { increment: 1 },
      },
    });

    if (completedCount !== prevCompleted) {
      await this.notify.writeHistory(companyId, targetId, actorId, "progress", {
        completedQuantity: completedCount,
        percentage: metrics.percentage,
      });
      await this.notify.notifyAssignees(
        companyId,
        actorId,
        row,
        metrics.derivedStatus === "completed" ? "completed" : "progress"
      );
    }

    await this.notify.maybeDeadlineWarning(companyId, actorId, row, metrics);
    return mapTarget(row);
  }
}
