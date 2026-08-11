import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { CrmLeadStatus, CrmStageCategory, type Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { assertCap, canViewOthersLeads, type Actor } from "./crm-access";
import { buildPipelineBreakdown, buildSalesPerformance, countBy, round1 } from "./crm-analytics";
import { PERFORMANCE_PROFILE_RECENT_LIMIT } from "./crm-defaults";
import {
  mapLeadActivity,
  mapLeadFeedback,
  mapSalesProfileLead,
} from "./crm-mappers";
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
    if (!canViewOthersLeads(actor)) {
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
    if (query.ownerEmployeeId && canViewOthersLeads(actor)) {
      where.ownerEmployeeId = query.ownerEmployeeId;
    }
    const [leads, feedback] = await Promise.all([
      this.prisma.crmLead.findMany({ where }),
      this.prisma.crmLeadFeedback.findMany({
        where: {
          companyId,
          deletedAt: null,
          lead: {
            deletedAt: null,
            ...this.shared.scopeOwnerFilter(actor),
            ...(query.ownerEmployeeId && canViewOthersLeads(actor)
              ? { ownerEmployeeId: query.ownerEmployeeId }
              : {}),
          },
        },
        select: {
          leadId: true,
          recordedByEmployeeId: true,
          callAnswered: true,
        },
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
    if (!canViewOthersLeads(actor) && actor.employeeId !== employeeId) {
      throw new ForbiddenException("You can only view your own performance");
    }
    if (canViewOthersLeads(actor)) assertCap(actor, "view_performance");
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
    const profileLeads = leads.map((lead) =>
      mapSalesProfileLead(lead, stageById.get(lead.stageId) ?? null)
    );
    const won = leads.filter(
      (l) => stageById.get(l.stageId)?.category === CrmStageCategory.won
    ).length;
    const lost = leads.filter(
      (l) => stageById.get(l.stageId)?.category === CrmStageCategory.lost
    ).length;
    const activeLeads = leads.filter(
      (l) => l.status === CrmLeadStatus.active
    ).length;
    const decided = won + lost;
    const pendingFollowUps = leads.filter(
      (l) => l.status === CrmLeadStatus.active && l.nextFollowUpAt != null
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
      leads: profileLeads,
      recentActivities: activities.map(mapLeadActivity),
      feedback: feedback.map(mapLeadFeedback),
    };
  }
}
