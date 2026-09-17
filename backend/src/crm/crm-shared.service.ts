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
  NotificationAudience,
  type CrmLead,
  type Prisma,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { employeeIdsForScope } from "../common/employee-scope";
import { NotificationsService } from "../notifications/notifications.service";
import {
  assertCap,
  canViewOthersLeads,
  crmLeadAccessScope,
  ownerIdAllowed,
  type Actor,
} from "./crm-access";
import {
  CRM_SYSTEM_ACTOR_ID,
  DEFAULT_BUSINESS_TYPES,
  DEFAULT_FEEDBACK_TYPES,
  DEFAULT_STAGES,
} from "./crm-defaults";

@Injectable()
export class CrmSharedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService
  ) {}

  async ensureDefaultStages(companyId: string, actorId = CRM_SYSTEM_ACTOR_ID) {
    const count = await this.prisma.crmStage.count({
      where: { companyId, deletedAt: null },
    });
    if (count === 0) {
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
      return;
    }

    // Existing tenants: always keep a Lost stage so feedback can close deals.
    await this.ensureLostStage(companyId, actorId);
  }

  /**
   * Ensure an active stage named "Lost" (category=lost) exists.
   * Other lost stages (e.g. "Not interested") are left alone.
   */
  async ensureLostStage(companyId: string, actorId = CRM_SYSTEM_ACTOR_ID) {
    const namedLost = await this.prisma.crmStage.findFirst({
      where: {
        companyId,
        deletedAt: null,
        name: { equals: "Lost", mode: "insensitive" },
      },
    });

    if (namedLost) {
      if (
        namedLost.category !== "lost" ||
        !namedLost.active ||
        namedLost.conversionProbability !== 0
      ) {
        await this.prisma.crmStage.update({
          where: { id: namedLost.id },
          data: {
            category: "lost",
            active: true,
            color: namedLost.color || "#ef4444",
            conversionProbability: 0,
            updatedBy: actorId,
          },
        });
      }
      return;
    }

    const maxSort = await this.prisma.crmStage.aggregate({
      where: { companyId, deletedAt: null },
      _max: { sortOrder: true },
    });
    const lostDefault =
      DEFAULT_STAGES.find((s) => s.category === "lost") ?? {
        name: "Lost",
        color: "#ef4444",
        sortOrder: 8,
        category: "lost" as const,
        conversionProbability: 0,
      };

    await this.prisma.crmStage.create({
      data: {
        companyId,
        name: lostDefault.name,
        description: "Closed lost",
        color: lostDefault.color,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
        category: lostDefault.category,
        conversionProbability: lostDefault.conversionProbability,
        active: true,
        createdBy: actorId,
        updatedBy: actorId,
      },
    });
  }

  async ensureDefaultFeedbackTypes(
    companyId: string,
    actorId = CRM_SYSTEM_ACTOR_ID
  ) {
    const count = await this.prisma.crmFeedbackType.count({
      where: { companyId, deletedAt: null },
    });
    if (count === 0) {
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
      return;
    }

    // Existing tenants: keep "Other" usable as a custom loss reason,
    // and fill any missing famous loss-reason presets by name.
    await this.prisma.crmFeedbackType.updateMany({
      where: {
        companyId,
        deletedAt: null,
        name: "Other",
        isLossReason: false,
      },
      data: { isLossReason: true, updatedBy: actorId },
    });
    const existing = await this.prisma.crmFeedbackType.findMany({
      where: { companyId, deletedAt: null },
      select: { name: true },
    });
    const have = new Set(existing.map((row) => row.name.toLowerCase()));
    const missing = DEFAULT_FEEDBACK_TYPES.filter(
      (f) => f.isLossReason && !have.has(f.name.toLowerCase())
    );
    if (missing.length > 0) {
      const maxSort = await this.prisma.crmFeedbackType.aggregate({
        where: { companyId, deletedAt: null },
        _max: { sortOrder: true },
      });
      let sortOrder = (maxSort._max.sortOrder ?? -1) + 1;
      await this.prisma.crmFeedbackType.createMany({
        data: missing.map((f) => ({
          companyId,
          name: f.name,
          sortOrder: sortOrder++,
          isLossReason: true,
          createdBy: actorId,
          updatedBy: actorId,
        })),
      });
    }
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

  scopeOwnerFilter(actor: Actor, ownerIds?: string[] | null): Prisma.CrmLeadWhereInput {
    if (ownerIds !== undefined) {
      if (ownerIds === null) return {};
      if (ownerIds.length === 0) return { id: { in: [] } };
      return { ownerEmployeeId: { in: ownerIds } };
    }
    if (canViewOthersLeads(actor)) return {};
    const employeeId = actor.employeeId?.trim();
    if (!employeeId) return { id: { in: [] } };
    return { ownerEmployeeId: employeeId };
  }

  async resolveOwnerIds(
    companyId: string,
    actor: Actor
  ): Promise<string[] | null> {
    return employeeIdsForScope(
      this.prisma,
      companyId,
      actor.employeeId,
      crmLeadAccessScope(actor)
    );
  }

  async ownerScope(
    companyId: string,
    actor: Actor
  ): Promise<Prisma.CrmLeadWhereInput> {
    return this.scopeOwnerFilter(actor, await this.resolveOwnerIds(companyId, actor));
  }

  extraOwnerFilter(
    ownerIds: string[] | null,
    requestedOwnerId?: string
  ): Prisma.CrmLeadWhereInput {
    if (!requestedOwnerId) return {};
    if (requestedOwnerId === "__unassigned__") {
      return { ownerEmployeeId: null };
    }
    if (ownerIdAllowed(ownerIds, requestedOwnerId)) {
      return { ownerEmployeeId: requestedOwnerId };
    }
    return { id: { in: [] } };
  }

  async assertOwnerAssignable(
    companyId: string,
    actor: Actor,
    ownerEmployeeId: string | null
  ) {
    if (!ownerEmployeeId) return;
    const ownerIds = await this.resolveOwnerIds(companyId, actor);
    if (!ownerIdAllowed(ownerIds, ownerEmployeeId)) {
      throw new ForbiddenException(
        "You can only assign leads to people in your team"
      );
    }
  }

  async requireLead(companyId: string, actor: Actor, id: string) {
    assertCap(actor, "view");
    const lead = await this.prisma.crmLead.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
        ...(await this.ownerScope(companyId, actor)),
      },
    });
    if (!lead) throw new NotFoundException("Lead not found");
    return lead;
  }

  async assertCanEditLead(companyId: string, actor: Actor, lead: CrmLead) {
    assertCap(actor, "edit");
    if (canViewOthersLeads(actor)) return;
    const ownerIds = await this.resolveOwnerIds(companyId, actor);
    if (ownerIds === null) return;
    if (!lead.ownerEmployeeId || !ownerIds.includes(lead.ownerEmployeeId)) {
      throw new ForbiddenException("You can only edit leads in your team scope");
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

  /**
   * Notify the sales owner when a lead is assigned to them (not self-assign).
   * Never throws — assignment must not fail because of notifications.
   */
  async notifyLeadAssignedToOwner(opts: {
    companyId: string;
    actor: Actor;
    lead: {
      id: string;
      name: string;
      phone: string | null;
      companyName: string | null;
      stageId: string;
      ownerEmployeeId: string | null;
    };
  }): Promise<void> {
    const ownerEmployeeId = opts.lead.ownerEmployeeId?.trim() || "";
    if (!ownerEmployeeId) return;
    if (
      opts.actor.employeeId &&
      ownerEmployeeId === opts.actor.employeeId
    ) {
      return;
    }

    try {
      const users = await this.prisma.user.findMany({
        where: {
          companyId: opts.companyId,
          employeeId: ownerEmployeeId,
          deletedAt: null,
          isActive: true,
        },
        select: { id: true },
      });
      const recipientIds = users
        .map((u) => u.id)
        .filter((id) => id && id !== opts.actor.userId);
      if (recipientIds.length === 0) return;

      let stageName = "—";
      if (opts.lead.stageId) {
        const stage = await this.prisma.crmStage.findFirst({
          where: {
            id: opts.lead.stageId,
            companyId: opts.companyId,
            deletedAt: null,
          },
          select: { name: true },
        });
        if (stage?.name) stageName = stage.name;
      }

      const actorName = await this.actorName(opts.actor);
      await this.notifications.notifyDomain({
        companyId: opts.companyId,
        actorId: opts.actor.userId,
        category: "work",
        priority: "high",
        audience: NotificationAudience.employee,
        titleKey: "notifications.crmLeadAssignedTitle",
        bodyKey: "notifications.crmLeadAssignedBody",
        vars: {
          actor: actorName,
          name: opts.lead.name || "—",
          phone: (opts.lead.phone || "").trim() || "—",
          company: (opts.lead.companyName || "").trim() || "—",
          stage: stageName,
        },
        href: `/crm?lead=${opts.lead.id}`,
        entityType: "crm_lead",
        entityId: opts.lead.id,
        recipientIds,
      });
    } catch {
      /* assignment must succeed even if notify fails */
    }
  }
}
