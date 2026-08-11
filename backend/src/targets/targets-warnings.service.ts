import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, TargetPenaltyType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { dateOnly, iso } from "../common/mappers";
import { computeTargetProgress } from "../lib/target-progress";
import { assertCap, canSeeTargetOthers, type Actor } from "./targets-access";
import { mapWarning } from "./targets-mappers";
import { TargetsNotifyService } from "./targets-notify.service";

@Injectable()
export class TargetsWarningsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly notify: TargetsNotifyService
  ) {}

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
    if (!canSeeTargetOthers(actor).all) {
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
    assertCap(actor, "send_warnings");
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
      startDate: iso(target.startDate),
      endDate: iso(target.endDate),
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

    await this.notify.writeHistory(companyId, targetId, actor.userId, "warning", {
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
      !canSeeTargetOthers(actor).all &&
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
}
