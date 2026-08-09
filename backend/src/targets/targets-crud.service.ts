import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, TargetPriority, TargetRiskLevel, TargetStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AppRole } from "../common/roles";
import { assertCap, type Actor } from "./targets-access";
import { mapTarget } from "./targets-mappers";
import { TargetsNotifyService } from "./targets-notify.service";

@Injectable()
export class TargetsCrudService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notify: TargetsNotifyService
  ) {}

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

  async deleteTarget(companyId: string, actor: Actor, id: string) {
    assertCap(actor, "delete");
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
    await this.notify.writeHistory(companyId, id, actor.userId, "archived", {});
    return { ok: true };
  }
}
