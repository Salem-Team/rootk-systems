import { BadRequestException, Inject, Injectable, forwardRef } from "@nestjs/common";
import { Prisma, TaskStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { iso } from "../../common/mappers";
import { WorkService } from "../../work/work.service";
import { isOrganicAdsLinkableTask } from "../../lib/organic-ads-task-match";
import { assertCap, type Actor } from "../organic-ads.helpers";
import { AppRole } from "../../common/roles";

/** Links advertisements to ads-quota WorkTasks and syncs task completion. */
@Injectable()
export class OrganicAdsTaskLinkService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => WorkService))
    private readonly work: WorkService
  ) {}

  /**
   * Find next open ads-quota WorkTask for an employee that isn't already
   * claimed by an OrganicAdvertisement. Target-linked ads tasks are preferred.
   */
  async findOpenLinkableTask(
    companyId: string,
    ownerEmployeeId: string,
    preferredTaskId?: string,
    preferredTargetId?: string
  ) {
    if (preferredTaskId) {
      const preferred = await this.prisma.workTask.findFirst({
        where: {
          id: preferredTaskId,
          companyId,
          deletedAt: null,
          assigneeIds: { has: ownerEmployeeId },
          status: { not: TaskStatus.completed },
          organicAdvertisement: null,
        },
        include: { target: { include: { type: true } } },
      });
      if (
        preferred &&
        isOrganicAdsLinkableTask(preferred, preferred.target?.type)
      ) {
        return preferred;
      }
      throw new BadRequestException(
        "Selected task is not available to link with this advertisement"
      );
    }

    const where: Prisma.WorkTaskWhereInput = {
      companyId,
      deletedAt: null,
      assigneeIds: { has: ownerEmployeeId },
      status: { not: TaskStatus.completed },
      organicAdvertisement: null,
      ...(preferredTargetId ? { targetId: preferredTargetId } : {}),
    };

    const candidates = await this.prisma.workTask.findMany({
      where,
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
      take: 80,
      include: { target: { include: { type: true } } },
    });

    const adsTasks = candidates.filter((t) =>
      isOrganicAdsLinkableTask(t, t.target?.type)
    );
    if (adsTasks.length === 0) return null;

    const withTarget = adsTasks.find((t) => !!t.targetId);
    return withTarget ?? adsTasks[0] ?? null;
  }

  /**
   * Complete linked WorkTask → TargetsService recalculates PerformanceTarget.
   */
  async completeLinkedTask(
    companyId: string,
    actor: Actor,
    taskId: string,
    adUrl: string,
    platform: string
  ) {
    await this.work.updateTaskStatus(
      companyId,
      {
        userId: actor.userId,
        role: actor.role,
        employeeId: actor.employeeId,
      },
      taskId,
      TaskStatus.completed,
      {
        links: [adUrl],
        notes: `Organic advertisement linked (${platform})`,
      }
    );
  }

  /**
   * Reopen linked task when ad is deleted/inactivated so target progress drops.
   */
  async reopenLinkedTask(companyId: string, actor: Actor, taskId: string) {
    const task = await this.prisma.workTask.findFirst({
      where: { id: taskId, companyId, deletedAt: null },
    });
    if (!task || task.status !== TaskStatus.completed) return;
    await this.work.updateTaskStatus(
      companyId,
      {
        userId: actor.userId,
        role: actor.role,
        employeeId: actor.employeeId,
      },
      taskId,
      TaskStatus.todo
    );
  }

  async listLinkableTasks(companyId: string, actor: Actor, employeeId?: string) {
    assertCap(actor, "view_own");
    const ownerId =
      actor.role === AppRole.admin && employeeId ? employeeId : actor.employeeId;

    const rows = await this.prisma.workTask.findMany({
      where: {
        companyId,
        deletedAt: null,
        assigneeIds: { has: ownerId },
        status: { not: TaskStatus.completed },
        organicAdvertisement: null,
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
      take: 80,
      include: {
        target: {
          select: {
            id: true,
            title: true,
            quantity: true,
            completedQuantity: true,
            status: true,
            type: { select: { id: true, name: true, unit: true, metadata: true } },
          },
        },
      },
    });

    return rows
      .filter((t) => isOrganicAdsLinkableTask(t, t.target?.type))
      .map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        dueDate: t.dueDate ? iso(t.dueDate) : "",
        tag: t.tag,
        targetId: t.targetId,
        targetTitle: t.target?.title ?? "",
        targetQuantity: t.target?.quantity ?? 0,
        targetCompleted: t.target?.completedQuantity ?? 0,
        targetStatus: t.target?.status ?? "",
      }));
  }
}
