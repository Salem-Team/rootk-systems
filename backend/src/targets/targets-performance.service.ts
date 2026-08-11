import { ForbiddenException, Injectable } from "@nestjs/common";
import { TaskStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { canSeeTargetOthers, type Actor } from "./targets-access";
import { TargetsCrudService } from "./targets-crud.service";
import { TargetsWarningsService } from "./targets-warnings.service";

@Injectable()
export class TargetsPerformanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crud: TargetsCrudService,
    private readonly warnings: TargetsWarningsService
  ) {}

  async employeePerformance(
    companyId: string,
    actor: Actor,
    employeeId: string
  ) {
    if (
      !canSeeTargetOthers(actor).all &&
      actor.employeeId !== employeeId
    ) {
      throw new ForbiddenException("Not allowed");
    }
    const targets = await this.crud.listTargets(companyId, actor, { employeeId });
    const warnings = await this.warnings.listWarnings(companyId, actor, { employeeId });
    const delayedTasks = await this.prisma.workTask.count({
      where: {
        companyId,
        deletedAt: null,
        assigneeIds: { has: employeeId },
        status: { not: TaskStatus.completed },
        dueDate: { lt: new Date() },
      },
    });

    const scores = targets.map((t) => t.performanceScore);
    const overallScore =
      scores.length === 0
        ? 0
        : Math.round(
            (scores.reduce((a, b) => a + b, 0) / scores.length) * 10
          ) / 10;

    return {
      employeeId,
      overallScore,
      currentTargets: targets.filter(
        (t) => t.status !== "completed" && t.status !== "cancelled"
      ).length,
      completed: targets.filter((t) => t.status === "completed").length,
      remaining: targets
        .map((t) => t.metrics?.remaining ?? 0)
        .reduce((a, b) => a + b, 0),
      warnings: warnings.length,
      delayedTasks,
      monthlyTrend: this.buildMonthlyTrend(targets),
      targets,
    };
  }

  private buildMonthlyTrend(
    targets: Array<{ performanceScore: number; updatedAt: string }>
  ) {
    const map = new Map<string, { sum: number; n: number }>();
    for (const t of targets) {
      const month = t.updatedAt.slice(0, 7);
      const cur = map.get(month) ?? { sum: 0, n: 0 };
      cur.sum += t.performanceScore;
      cur.n += 1;
      map.set(month, cur);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, v]) => ({
        month,
        score: Math.round((v.sum / v.n) * 10) / 10,
      }));
  }
}
