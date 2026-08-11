import { Injectable } from "@nestjs/common";
import { Prisma, TaskStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { auditFields, iso } from "../common/mappers";
import { canSeeTargetOthers, type Actor } from "./targets-access";
import { TargetsCrudService } from "./targets-crud.service";

@Injectable()
export class TargetsDelayedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crud: TargetsCrudService
  ) {}

  async delayedCenter(companyId: string, actor: Actor) {
    const targets = await this.crud.listTargets(companyId, actor, {});
    const delayedTargets = targets.filter(
      (t) =>
        t.status === "delayed" ||
        t.riskLevel === "critical" ||
        t.riskLevel === "high" ||
        t.health === "critical" ||
        t.health === "delayed"
    );

    const taskWhere: Prisma.WorkTaskWhereInput = {
      companyId,
      deletedAt: null,
      OR: [
        {
          dueDate: { lt: new Date() },
          status: { not: TaskStatus.completed },
        },
        { targetId: { in: delayedTargets.map((t) => t.id) } },
      ],
    };
    if (!canSeeTargetOthers(actor).all) {
      taskWhere.assigneeIds = { has: actor.employeeId };
    }

    const delayedTasks = await this.prisma.workTask.findMany({
      where: taskWhere,
      orderBy: { dueDate: "asc" },
      take: 200,
    });

    return {
      delayedTargets,
      criticalTargets: targets.filter(
        (t) => t.priority === "critical" || t.riskLevel === "critical"
      ),
      highRiskTargets: targets.filter((t) => t.riskLevel === "high"),
      delayedTasks: delayedTasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate ? iso(t.dueDate) : "",
        assigneeIds: t.assigneeIds,
        targetId: t.targetId,
        ...auditFields(t),
      })),
    };
  }
}
