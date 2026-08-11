/** Cross-cutting CRM helpers: defaults seeding, audit trail, lead scoping/guards. */
import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import {
  CrmActivityType,
  CrmLeadStatus,
  CrmStageCategory,
  type CrmLead,
  type Prisma,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { assertCap, canViewOthersLeads, type Actor } from "./crm-access";
import {
  CRM_SYSTEM_ACTOR_ID,
  DEFAULT_BUSINESS_TYPES,
  DEFAULT_FEEDBACK_TYPES,
  DEFAULT_STAGES,
} from "./crm-defaults";

@Injectable()
export class CrmSharedService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureDefaultStages(companyId: string, actorId = CRM_SYSTEM_ACTOR_ID) {
    const count = await this.prisma.crmStage.count({
      where: { companyId, deletedAt: null },
    });
    if (count > 0) return;
    await this.prisma.crmStage.createMany({
      data: DEFAULT_STAGES.map((s) => ({
        companyId,
        name: s.name,
        color: s.color,
        sortOrder: s.sortOrder,
        category: s.category,
        conversionProbability: s.conversionProbability,
        createdBy: actorId,
        updatedBy: actorId,
      })),
    });
  }

  async ensureDefaultFeedbackTypes(
    companyId: string,
    actorId = CRM_SYSTEM_ACTOR_ID
  ) {
    const count = await this.prisma.crmFeedbackType.count({
      where: { companyId, deletedAt: null },
    });
    if (count > 0) return;
    await this.prisma.crmFeedbackType.createMany({
      data: DEFAULT_FEEDBACK_TYPES.map((f) => ({
        companyId,
        name: f.name,
        sortOrder: f.sortOrder,
        isLossReason: f.isLossReason,
        createdBy: actorId,
        updatedBy: actorId,
      })),
    });
  }

  async ensureDefaultBusinessTypes(
    companyId: string,
    actorId = CRM_SYSTEM_ACTOR_ID
  ) {
    const count = await this.prisma.crmBusinessType.count({
      where: { companyId, deletedAt: null },
    });
    if (count > 0) return;
    await this.prisma.crmBusinessType.createMany({
      data: DEFAULT_BUSINESS_TYPES.map((b) => ({
        companyId,
        name: b.name,
        sortOrder: b.sortOrder,
        createdBy: actorId,
        updatedBy: actorId,
      })),
    });
  }

  async actorName(actor: Actor): Promise<string> {
    if (actor.employeeId) {
      const emp = await this.prisma.employee.findFirst({
        where: { id: actor.employeeId, deletedAt: null },
        select: { name: true },
      });
      if (emp?.name) return emp.name;
    }
    const user = await this.prisma.user.findFirst({
      where: { id: actor.userId, deletedAt: null },
      select: { displayName: true, email: true },
    });
    return user?.displayName?.trim() || user?.email || actor.userId;
  }

  async writeHistory(
    companyId: string,
    input: {
      leadId?: string | null;
      action: string;
      actorId: string;
      actorName: string;
      note: string;
      previousValue?: string | null;
      newValue?: string | null;
    }
  ) {
    await this.prisma.crmLeadHistoryEvent.create({
      data: {
        companyId,
        leadId: input.leadId ?? null,
        action: input.action,
        actorId: input.actorId,
        actorName: input.actorName,
        note: input.note,
        previousValue: input.previousValue ?? null,
        newValue: input.newValue ?? null,
        createdBy: input.actorId,
        updatedBy: input.actorId,
      },
    });
  }

  async writeLeadActivity(
    companyId: string,
    input: {
      leadId: string;
      type: CrmActivityType;
      title: string;
      description?: string;
      actorEmployeeId?: string | null;
      actorId: string;
      occurredAt?: Date;
    }
  ) {
    const row = await this.prisma.crmLeadActivity.create({
      data: {
        companyId,
        leadId: input.leadId,
        type: input.type,
        title: input.title,
        description: input.description ?? "",
        actorEmployeeId: input.actorEmployeeId ?? null,
        occurredAt: input.occurredAt ?? new Date(),
        createdBy: input.actorId,
        updatedBy: input.actorId,
      },
    });
    await this.prisma.crmLead.update({
      where: { id: input.leadId },
      data: {
        lastActivityAt: row.occurredAt,
        updatedBy: input.actorId,
        version: { increment: 1 },
      },
    });
    return row;
  }

  scopeOwnerFilter(actor: Actor): Prisma.CrmLeadWhereInput {
    if (canViewOthersLeads(actor)) return {};
    const employeeId = actor.employeeId?.trim();
    if (!employeeId) return { id: { in: [] } };
    return { ownerEmployeeId: employeeId };
  }

  async requireLead(companyId: string, actor: Actor, id: string) {
    assertCap(actor, "view");
    const lead = await this.prisma.crmLead.findFirst({
      where: { id, companyId, deletedAt: null, ...this.scopeOwnerFilter(actor) },
    });
    if (!lead) throw new NotFoundException("Lead not found");
    return lead;
  }

  assertCanEditLead(actor: Actor, lead: CrmLead) {
    assertCap(actor, "edit");
    if (canViewOthersLeads(actor)) return;
    if (lead.ownerEmployeeId !== actor.employeeId) {
      throw new ForbiddenException("You can only edit your own leads");
    }
  }

  async applyStageSideEffects(
    companyId: string,
    stageId: string,
    lossReasonTypeId: string | null | undefined,
    patch: {
      stageId?: string;
      status?: CrmLeadStatus;
      convertedAt?: Date | null;
      lossReasonTypeId?: string | null;
    }
  ) {
    const stage = await this.prisma.crmStage.findFirst({
      where: { id: stageId, companyId, deletedAt: null },
    });
    if (!stage) throw new NotFoundException("Stage not found");

    if (stage.category === CrmStageCategory.won) {
      patch.convertedAt = patch.convertedAt ?? new Date();
      patch.status = CrmLeadStatus.active;
    } else if (stage.category === CrmStageCategory.lost) {
      const reason =
        lossReasonTypeId !== undefined
          ? lossReasonTypeId
          : patch.lossReasonTypeId;
      if (!reason) {
        throw new BadRequestException(
          "lossReasonTypeId is required when moving to a lost stage"
        );
      }
      const ft = await this.prisma.crmFeedbackType.findFirst({
        where: { id: reason, companyId, deletedAt: null },
      });
      if (!ft) throw new NotFoundException("Loss reason type not found");
      patch.lossReasonTypeId = reason;
      patch.convertedAt = null;
    } else if (patch.convertedAt === undefined) {
      // leaving won → clear conversion if moving to open
      if (stage.category === CrmStageCategory.open) {
        patch.convertedAt = null;
      }
    }
    return stage;
  }
}
