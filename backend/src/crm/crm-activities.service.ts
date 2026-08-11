import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CrmActivityType, CrmNextAction, type Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { writeActivity } from "../common/activity-writer";
import { assertCap, isAdmin, type Actor } from "./crm-access";
import {
  clampPage,
  clampPageSize,
  DEFAULT_ACTIVITIES_PAGE_SIZE,
  DEFAULT_FEEDBACK_PAGE_SIZE,
} from "./crm-defaults";
import { ACTIVITY_TYPES, asEnum, asOptionalDate, NEXT_ACTIONS } from "./crm-input";
import { mapLeadActivity, mapLeadFeedback } from "./crm-mappers";
import { CrmSharedService } from "./crm-shared.service";

@Injectable()
export class CrmActivitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shared: CrmSharedService
  ) {}

  async addActivity(
    companyId: string,
    actor: Actor,
    leadId: string,
    body: Record<string, unknown>
  ) {
    const lead = await this.shared.requireLead(companyId, actor, leadId);
    this.shared.assertCanEditLead(actor, lead);

    const title = String(body.title ?? "").trim();
    if (!title) throw new BadRequestException("title is required");
    const type = asEnum<CrmActivityType>(
      body.type,
      ACTIVITY_TYPES,
      "type",
      CrmActivityType.note
    );
    const occurredAt = asOptionalDate(body.occurredAt);

    const row = await this.shared.writeLeadActivity(companyId, {
      leadId,
      type,
      title,
      description: String(body.description ?? ""),
      actorEmployeeId: actor.employeeId,
      actorId: actor.userId,
      occurredAt: occurredAt ?? new Date(),
    });

    await this.shared.writeHistory(companyId, {
      leadId,
      action: "activity_added",
      actorId: actor.userId,
      actorName: await this.shared.actorName(actor),
      note: title,
      newValue: type,
    });
    await writeActivity(this.prisma, {
      companyId,
      type: "crm_activity_added",
      title: "CRM activity added",
      description: `${lead.name}: ${title}`,
      employeeId: lead.ownerEmployeeId ?? undefined,
      actorId: actor.userId,
    });

    return mapLeadActivity(row);
  }

  async getTimeline(companyId: string, actor: Actor, leadId: string) {
    await this.shared.requireLead(companyId, actor, leadId);
    const [activities] = await Promise.all([
      this.prisma.crmLeadActivity.findMany({
        where: { companyId, leadId, deletedAt: null },
        orderBy: { occurredAt: "desc" },
      }),
      this.prisma.crmLeadFeedback.findMany({
        where: { companyId, leadId, deletedAt: null },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.crmLeadHistoryEvent.findMany({
        where: { companyId, leadId, deletedAt: null },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Flat activity list — matches frontend timeline expectation.
    // (history/feedback remain available via dedicated endpoints)
    return activities.map(mapLeadActivity);
  }

  async addFeedback(
    companyId: string,
    actor: Actor,
    leadId: string,
    body: Record<string, unknown>
  ) {
    const lead = await this.shared.requireLead(companyId, actor, leadId);
    this.shared.assertCanEditLead(actor, lead);
    await this.shared.ensureDefaultFeedbackTypes(companyId);

    let feedbackTypeId = String(body.feedbackTypeId ?? "").trim();
    let ft = feedbackTypeId
      ? await this.prisma.crmFeedbackType.findFirst({
          where: { id: feedbackTypeId, companyId, deletedAt: null },
        })
      : null;
    if (!ft) {
      // Simplified feedback UI no longer requires a type — pick a default.
      ft =
        (await this.prisma.crmFeedbackType.findFirst({
          where: {
            companyId,
            deletedAt: null,
            active: true,
            name: { equals: "Other", mode: "insensitive" },
          },
          orderBy: { sortOrder: "asc" },
        })) ??
        (await this.prisma.crmFeedbackType.findFirst({
          where: { companyId, deletedAt: null, active: true },
          orderBy: { sortOrder: "asc" },
        }));
      if (!ft) throw new NotFoundException("Feedback type not found");
      feedbackTypeId = ft.id;
    }

    const callAnswered =
      body.callAnswered === undefined
        ? true
        : body.callAnswered === true || body.callAnswered === "true";
    const nextAction = asEnum<CrmNextAction>(
      body.nextAction,
      NEXT_ACTIONS,
      "nextAction",
      CrmNextAction.call
    );
    const nextFollowUpAt = asOptionalDate(body.nextFollowUpAt);
    const stageId =
      typeof body.stageId === "string" && body.stageId.trim()
        ? body.stageId.trim()
        : null;
    const tags = Array.isArray(body.tags)
      ? body.tags.map((v) => String(v).trim()).filter(Boolean)
      : undefined;

    if (stageId) {
      const stage = await this.prisma.crmStage.findFirst({
        where: { id: stageId, companyId, deletedAt: null },
      });
      if (!stage) throw new BadRequestException("Invalid stageId");
    }

    // Prefer a real Employee.id so Active/Inactive call metrics attribute correctly.
    let recordedByEmployeeId: string | undefined =
      actor.employeeId ?? lead.ownerEmployeeId ?? undefined;
    if (recordedByEmployeeId) {
      const recorder = await this.prisma.employee.findFirst({
        where: { id: recordedByEmployeeId, companyId, deletedAt: null },
        select: { id: true },
      });
      if (!recorder) {
        recordedByEmployeeId = lead.ownerEmployeeId ?? undefined;
      }
    }

    const row = await this.prisma.crmLeadFeedback.create({
      data: {
        companyId,
        leadId,
        feedbackTypeId,
        customerFeedback: String(body.customerFeedback ?? ""),
        callAnswered,
        nextAction,
        nextFollowUpAt: nextFollowUpAt === undefined ? null : nextFollowUpAt,
        notes: String(body.notes ?? ""),
        recordedByEmployeeId: recordedByEmployeeId ?? null,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      },
    });

    const leadPatch: Prisma.CrmLeadUpdateInput = {
      nextAction,
      lastActivityAt: new Date(),
      updatedBy: actor.userId,
      version: { increment: 1 },
    };
    if (nextFollowUpAt !== undefined) {
      leadPatch.nextFollowUpAt = nextFollowUpAt;
    }
    if (tags) leadPatch.tags = tags;
    if (ft.isLossReason && !lead.lossReasonTypeId) {
      leadPatch.lossReasonTypeId = feedbackTypeId;
    }
    if (stageId && stageId !== lead.stageId) {
      const stagePatch: {
        stageId?: string;
        status?: import("@prisma/client").CrmLeadStatus;
        convertedAt?: Date | null;
        lossReasonTypeId?: string | null;
      } = { stageId };
      await this.shared.applyStageSideEffects(
        companyId,
        stageId,
        lead.lossReasonTypeId,
        stagePatch
      );
      leadPatch.stage = { connect: { id: stageId } };
      if (stagePatch.status) leadPatch.status = stagePatch.status;
      if (stagePatch.convertedAt !== undefined) {
        leadPatch.convertedAt = stagePatch.convertedAt;
      }
      if (stagePatch.lossReasonTypeId !== undefined) {
        leadPatch.lossReasonTypeId = stagePatch.lossReasonTypeId;
      }
    }
    await this.prisma.crmLead.update({ where: { id: leadId }, data: leadPatch });

    const callLabel = callAnswered ? "answered" : "no_answer";
    await this.shared.writeLeadActivity(companyId, {
      leadId,
      type: CrmActivityType.feedback,
      title: `Feedback: ${callLabel}`,
      description: String(body.customerFeedback ?? ""),
      actorEmployeeId: actor.employeeId,
      actorId: actor.userId,
    });
    await this.shared.writeHistory(companyId, {
      leadId,
      action: "feedback_added",
      actorId: actor.userId,
      actorName: await this.shared.actorName(actor),
      note: callLabel,
      newValue: stageId ?? feedbackTypeId,
    });
    await writeActivity(this.prisma, {
      companyId,
      type: "crm_feedback_added",
      title: "CRM feedback recorded",
      description: `${lead.name}: ${callLabel}`,
      employeeId: lead.ownerEmployeeId ?? undefined,
      actorId: actor.userId,
    });

    return mapLeadFeedback(row);
  }

  async listRecentActivities(
    companyId: string,
    actor: Actor,
    page = 1,
    pageSize = DEFAULT_ACTIVITIES_PAGE_SIZE
  ) {
    assertCap(actor, "view");
    const safePage = clampPage(page);
    const safeSize = clampPageSize(pageSize, DEFAULT_ACTIVITIES_PAGE_SIZE);

    const where: Prisma.CrmLeadActivityWhereInput = {
      companyId,
      deletedAt: null,
      ...(isAdmin(actor)
        ? {}
        : { lead: { deletedAt: null, ...this.shared.scopeOwnerFilter(actor) } }),
    };

    const rows = await this.prisma.crmLeadActivity.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      skip: (safePage - 1) * safeSize,
      take: safeSize,
    });

    // Flat array — matches frontend `CrmLeadActivity[]`.
    return rows.map(mapLeadActivity);
  }

  async listFeedback(
    companyId: string,
    actor: Actor,
    query: Record<string, string | undefined>
  ) {
    assertCap(actor, "view");
    const page = clampPage(Number(query.page) || 1);
    const pageSize = clampPageSize(
      Number(query.pageSize),
      DEFAULT_FEEDBACK_PAGE_SIZE
    );

    const where: Prisma.CrmLeadFeedbackWhereInput = {
      companyId,
      deletedAt: null,
      ...(query.feedbackTypeId ? { feedbackTypeId: query.feedbackTypeId } : {}),
      ...(query.leadId ? { leadId: query.leadId } : {}),
      lead: {
        deletedAt: null,
        ...this.shared.scopeOwnerFilter(actor),
        ...(query.ownerEmployeeId && isAdmin(actor)
          ? { ownerEmployeeId: query.ownerEmployeeId }
          : {}),
      },
    };

    const rows = await this.prisma.crmLeadFeedback.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // Flat array — matches frontend `CrmLeadFeedback[]`.
    return rows.map(mapLeadFeedback);
  }
}
