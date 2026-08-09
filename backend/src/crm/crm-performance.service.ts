import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { CrmLeadStatus, CrmStageCategory, type Prisma } from "@prisma/client";
import { startOfDay } from "date-fns";
import { PrismaService } from "../prisma/prisma.service";
import { assertCap, isAdmin, type Actor } from "./crm-access";
import { buildPipelineBreakdown, buildSalesPerformance, countBy, round1 } from "./crm-analytics";
import { PERFORMANCE_PROFILE_RECENT_LIMIT } from "./crm-defaults";
import { mapLeadActivity, mapLeadFeedback } from "./crm-mappers";
import { CrmSharedService } from "./crm-shared.service";

@Injectable()
export class CrmPerformanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shared: CrmSharedService
  ) {}

  async performance(
    companyId: string,
    actor: Actor,
    query: Record<string, string | undefined>
  ) {
    if (!isAdmin(actor)) {
      assertCap(actor, "view_dashboard");
    } else {
      assertCap(actor, "view_performance");
    }

    await this.shared.ensureDefaultStages(companyId);
    const stages = await this.prisma.crmStage.findMany({
      where: { companyId, deletedAt: null },
    });
    const where: Prisma.CrmLeadWhereInput = {
      companyId,
      deletedAt: null,
      ...this.shared.scopeOwnerFilter(actor),
    };
    if (query.ownerEmployeeId && isAdmin(actor)) {
      where.ownerEmployeeId = query.ownerEmployeeId;
    }
    const [leads, feedback] = await Promise.all([
      this.prisma.crmLead.findMany({ where }),
      this.prisma.crmLeadFeedback.findMany({
        where: {
          companyId,
          deletedAt: null,
          ...(isAdmin(actor)
            ? {}
            : { recordedByEmployeeId: actor.employeeId }),
        },
        select: { recordedByEmployeeId: true, callAnswered: true },
      }),
    ]);
    const ownerIds = [
      ...new Set(
        leads.map((l) => l.ownerEmployeeId).filter((v): v is string => Boolean(v))
      ),
    ];
    const employees = ownerIds.length
      ? await this.prisma.employee.findMany({
          where: { companyId, id: { in: ownerIds }, deletedAt: null },
          select: { id: true, name: true },
        })
      : [];

    // Flat array — matches frontend `CrmSalesPerformanceRow[]`.
    return buildSalesPerformance(leads, stages, employees, feedback);
  }

  async performanceProfile(companyId: string, actor: Actor, employeeId: string) {
    if (!isAdmin(actor) && actor.employeeId !== employeeId) {
      throw new ForbiddenException("You can only view your own performance");
    }
    if (isAdmin(actor)) assertCap(actor, "view_performance");
    else assertCap(actor, "view_dashboard");

    await this.shared.ensureDefaultStages(companyId);
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, companyId, deletedAt: null },
    });
    if (!employee) throw new NotFoundException("Employee not found");

    const [leads, stages, activities, feedback] = await Promise.all([
      this.prisma.crmLead.findMany({
        where: { companyId, deletedAt: null, ownerEmployeeId: employeeId },
      }),
      this.prisma.crmStage.findMany({
        where: { companyId, deletedAt: null },
        orderBy: { sortOrder: "asc" },
      }),
      this.prisma.crmLeadActivity.findMany({
        where: {
          companyId,
          deletedAt: null,
          lead: { ownerEmployeeId: employeeId, deletedAt: null },
        },
        orderBy: { occurredAt: "desc" },
        take: PERFORMANCE_PROFILE_RECENT_LIMIT,
      }),
      this.prisma.crmLeadFeedback.findMany({
        where: {
          companyId,
          deletedAt: null,
          lead: { ownerEmployeeId: employeeId, deletedAt: null },
        },
        orderBy: { createdAt: "desc" },
        take: PERFORMANCE_PROFILE_RECENT_LIMIT,
      }),
    ]);

    const stageById = new Map(stages.map((s) => [s.id, s]));
    const won = leads.filter(
      (l) => stageById.get(l.stageId)?.category === CrmStageCategory.won
    ).length;
    const lost = leads.filter(
      (l) => stageById.get(l.stageId)?.category === CrmStageCategory.lost
    ).length;
    const activeLeads = leads.filter(
      (l) =>
        l.status === CrmLeadStatus.active &&
        stageById.get(l.stageId)?.category === CrmStageCategory.open
    ).length;
    const decided = won + lost;
    const startToday = startOfDay(new Date());
    const pendingFollowUps = leads.filter(
      (l) => l.nextFollowUpAt != null && l.nextFollowUpAt >= startToday
    ).length;

    const countsByStage = countBy(leads, (l) => l.stageId);
    const total = Math.max(1, leads.length);
    const pipeline = buildPipelineBreakdown(stages, countsByStage, total);

    return {
      employeeId,
      employeeName: employee.name,
      overview: {
        totalLeads: leads.length,
        activeLeads,
        won,
        lost,
        conversionRate: decided > 0 ? round1(won / decided) : 0,
        pendingFollowUps,
      },
      pipeline,
      recentActivities: activities.map(mapLeadActivity),
      feedback: feedback.map(mapLeadFeedback),
    };
  }
}
