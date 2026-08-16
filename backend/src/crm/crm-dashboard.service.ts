import { Injectable } from "@nestjs/common";
import { CrmLeadSource, type Prisma } from "@prisma/client";
import {
  eachDayOfInterval,
  endOfDay,
  format,
  startOfDay,
  subDays,
} from "date-fns";
import { PrismaService } from "../prisma/prisma.service";
import { assertCap, type Actor } from "./crm-access";
import {
  buildFeedbackReasons,
  buildSalesPerformance,
  buildStageCards,
  buildTrendSeries,
  countBy,
  resolveDateBounds,
  resolvePreviousPeriod,
} from "./crm-analytics";
import {
  buildInteractionBreakdown,
} from "./crm-interaction-breakdown";
import {
  buildDashboardKpis,
  buildInsights,
  buildNeedsAttentionItems,
  computeAttentionCounts,
} from "./crm-dashboard-analytics";
import { LEAD_SOURCES } from "./crm-input";
import { CrmSharedService } from "./crm-shared.service";

@Injectable()
export class CrmDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shared: CrmSharedService
  ) {}

  private async loadScopedLeads(
    companyId: string,
    actor: Actor,
    query: Record<string, string | undefined>
  ) {
    assertCap(actor, "view_dashboard");
    const { from, to } = resolveDateBounds(query);
    const ownerIds = await this.shared.resolveOwnerIds(companyId, actor);
    const scopeFilter = this.shared.scopeOwnerFilter(actor, ownerIds);
    const ownerFilter = this.shared.extraOwnerFilter(
      ownerIds,
      query.ownerEmployeeId
    );
    const sourceFilter =
      query.source && LEAD_SOURCES.has(query.source)
        ? { source: query.source as CrmLeadSource }
        : {};

    const where: Prisma.CrmLeadWhereInput = {
      companyId,
      deletedAt: null,
      ...scopeFilter,
      ...ownerFilter,
      ...sourceFilter,
      ...(from ? { createdAt: { gte: from, lte: to } } : {}),
    };

    const [leads, stages, feedbackTypes, allActiveLeads] = await Promise.all([
      this.prisma.crmLead.findMany({ where }),
      this.shared.ensureDefaultStages(companyId).then(() =>
        this.prisma.crmStage.findMany({
          where: { companyId, deletedAt: null },
          orderBy: { sortOrder: "asc" },
        })
      ),
      this.shared.ensureDefaultFeedbackTypes(companyId).then(() =>
        this.prisma.crmFeedbackType.findMany({
          where: { companyId, deletedAt: null },
        })
      ),
      this.prisma.crmLead.findMany({
        where: {
          companyId,
          deletedAt: null,
          isArchived: false,
          ...scopeFilter,
          ...ownerFilter,
          ...sourceFilter,
        },
      }),
    ]);

    return { leads, stages, feedbackTypes, allActiveLeads, from, to, scopeFilter, ownerFilter };
  }

  async dashboard(
    companyId: string,
    actor: Actor,
    query: Record<string, string | undefined>
  ) {
    const { leads, stages, feedbackTypes, allActiveLeads, from, to, scopeFilter, ownerFilter } =
      await this.loadScopedLeads(companyId, actor, query);

    const stageById = new Map(stages.map((s) => [s.id, s]));
    const kpis = buildDashboardKpis(leads, allActiveLeads, stageById);

    const { prevFrom, prevTo } = resolvePreviousPeriod(from, to);
    let prevByStage = new Map<string, number>();
    if (prevFrom && prevTo) {
      const prevLeads = await this.prisma.crmLead.findMany({
        where: {
          companyId,
          deletedAt: null,
          createdAt: { gte: prevFrom, lte: endOfDay(prevTo) },
          ...scopeFilter,
          ...ownerFilter,
          ...(query.source && LEAD_SOURCES.has(query.source)
            ? { source: query.source as CrmLeadSource }
            : {}),
        },
        select: { stageId: true },
      });
      prevByStage = countBy(prevLeads, (p) => p.stageId);
    }

    const countsByStage = countBy(allActiveLeads, (l) => l.stageId);
    const pipelineTotal = Math.max(
      1,
      [...countsByStage.values()].reduce((a, b) => a + b, 0)
    );
    const stageCards = buildStageCards(
      stages,
      countsByStage,
      prevByStage,
      pipelineTotal
    );
    const leadsByStage = stageCards.map((s) => ({
      key: s.id,
      label: s.name,
      value: s.count,
      color: s.color,
    }));

    const rangeStart = from ?? startOfDay(subDays(to, 29));
    const days = eachDayOfInterval({ start: rangeStart, end: to });
    const dateKeyOf = (d: Date) => format(d, "yyyy-MM-dd");
    const leadsTrend = buildTrendSeries(
      days,
      dateKeyOf,
      (key) => leads.filter((l) => dateKeyOf(l.createdAt) === key).length
    );
    const conversionTrend = buildTrendSeries(
      days,
      dateKeyOf,
      (key) =>
        allActiveLeads.filter((l) => l.convertedAt && dateKeyOf(l.convertedAt) === key)
          .length
    );

    const feedbackRows = await this.prisma.crmLeadFeedback.findMany({
      where: {
        companyId,
        deletedAt: null,
        ...(from ? { createdAt: { gte: from, lte: to } } : {}),
        lead: {
          deletedAt: null,
          ...scopeFilter,
          ...ownerFilter,
        },
      },
      select: {
        id: true,
        feedbackTypeId: true,
        leadId: true,
        customerFeedback: true,
        notes: true,
        nextAction: true,
        recordedByEmployeeId: true,
        callAnswered: true,
        meetingMode: true,
        meetingLocation: true,
        createdAt: true,
      },
    });
    const allFeedbackRows = await this.prisma.crmLeadFeedback.findMany({
      where: {
        companyId,
        deletedAt: null,
        lead: {
          deletedAt: null,
          ...scopeFilter,
          ...ownerFilter,
        },
      },
      select: {
        id: true,
        feedbackTypeId: true,
        leadId: true,
        customerFeedback: true,
        notes: true,
        nextAction: true,
        recordedByEmployeeId: true,
        callAnswered: true,
        meetingMode: true,
        meetingLocation: true,
        createdAt: true,
      },
    });
    const hourFilter =
      query.hour !== undefined && query.hour !== ""
        ? Number(query.hour)
        : undefined;
    const periodFeedback =
      hourFilter !== undefined && !Number.isNaN(hourFilter)
        ? feedbackRows.filter((f) => f.createdAt.getHours() === hourFilter)
        : feedbackRows;
    const feedbackReasons = buildFeedbackReasons(
      countBy(periodFeedback, (f) => f.feedbackTypeId),
      feedbackTypes
    );

    const ownerIds = [
      ...new Set(
        [
          ...allActiveLeads
            .map((l) => l.ownerEmployeeId)
            .filter((v): v is string => Boolean(v)),
          ...allFeedbackRows
            .map((f) => f.recordedByEmployeeId)
            .filter((v): v is string => Boolean(v)),
        ]
      ),
    ];
    const employees = ownerIds.length
      ? await this.prisma.employee.findMany({
          where: { companyId, id: { in: ownerIds }, deletedAt: null },
          select: { id: true, name: true },
        })
      : [];
    const salesPerformance = buildSalesPerformance(
      allActiveLeads,
      stages,
      employees,
      periodFeedback
    );
    const interactionBreakdown = buildInteractionBreakdown(
      allFeedbackRows.map((f) => ({
        id: f.id,
        leadId: f.leadId,
        feedbackTypeId: f.feedbackTypeId,
        customerFeedback: f.customerFeedback,
        notes: f.notes,
        nextAction: f.nextAction,
        recordedByEmployeeId: f.recordedByEmployeeId,
        callAnswered: f.callAnswered,
        meetingMode: f.meetingMode,
        meetingLocation: f.meetingLocation,
        createdAt: f.createdAt,
      })),
      allActiveLeads.map((l) => ({
        id: l.id,
        name: l.name,
        companyName: l.companyName,
        phone: l.phone,
        phoneNormalized: l.phoneNormalized ?? null,
        ownerEmployeeId: l.ownerEmployeeId,
      })),
      employees,
      from,
      to,
      hourFilter
    );

    const attentionCounts = computeAttentionCounts(
      allActiveLeads,
      stageById,
      salesPerformance
    );
    const needsAttention = buildNeedsAttentionItems(attentionCounts);
    const insights = buildInsights({
      totalLeads: kpis.totalLeads,
      stageCards,
      conversionRate: kpis.conversionRate,
      overdueCount: attentionCounts.overdue,
      salesPerformance,
      feedbackReasons,
    });

    // Flat shape matches frontend `CrmDashboard` (src/types/crm.ts).
    return {
      kpis,
      stageCards,
      leadsByStage,
      leadsTrend,
      conversionTrend,
      feedbackReasons,
      salesPerformance,
      interactionBreakdown,
      needsAttention,
      insights,
    };
  }
}
