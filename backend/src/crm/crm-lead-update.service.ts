import { BadRequestException, Injectable } from "@nestjs/common";
import {
  CrmActivityType,
  CrmLeadSource,
  CrmLeadStatus,
  CrmNextAction,
  type Prisma,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { writeActivity } from "../common/activity-writer";
import { assertCap, type Actor } from "./crm-access";
import {
  asEnum,
  asOptionalDate,
  asStringArray,
  LEAD_SOURCES,
  LEAD_STATUSES,
  NEXT_ACTIONS,
} from "./crm-input";
import { mapLead } from "./crm-mappers";
import { clearFollowUpReminderMeta, asLeadMetadata } from "./crm-follow-up-meta";
import {
  assertContactsAvailable,
  resolveIncomingContactList,
} from "./crm-phone";
import {
  canonicalContactKeys,
  contactsMetadataPatch,
  extraContactsFromMetadata,
} from "../lib/lead-contacts";
import { CrmSharedService } from "./crm-shared.service";

@Injectable()
export class CrmLeadUpdateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shared: CrmSharedService
  ) {}

  async updateLead(
    companyId: string,
    actor: Actor,
    id: string,
    body: Record<string, unknown>
  ) {
    const current = await this.shared.requireLead(companyId, actor, id);
    await this.shared.assertCanEditLead(companyId, actor, current);

    const data: Prisma.CrmLeadUpdateInput = {
      updatedBy: actor.userId,
      version: { increment: 1 },
    };

    if (body.name !== undefined) {
      const name = String(body.name ?? "").trim();
      if (!name) throw new BadRequestException("name is required");
      data.name = name;
    }
    if (
      body.phone !== undefined ||
      body.contactKind !== undefined ||
      body.contacts !== undefined
    ) {
      const resolved = resolveIncomingContactList(body, {
        phone: current.phone,
        phoneNormalized: current.phoneNormalized,
        extras: extraContactsFromMetadata(current.metadata),
      });
      data.phone = resolved.primary.phone;
      data.phoneNormalized = resolved.primary.phoneNormalized;
      await assertContactsAvailable(
        this.prisma,
        companyId,
        canonicalContactKeys([resolved.primary, ...resolved.extras]),
        {
          excludeLeadId: id,
          visibleOwnerIds: await this.shared.resolveOwnerIds(companyId, actor),
          actorEmployeeId: actor.employeeId,
        }
      );
      if (resolved.replaceExtras) {
        data.metadata = contactsMetadataPatch(
          resolved.extras,
          current.metadata
        ) as Prisma.InputJsonValue;
      }
    }
    if (body.email !== undefined) data.email = String(body.email ?? "").trim();
    if (body.companyName !== undefined) {
      data.companyName = String(body.companyName ?? "").trim();
    }
    if (body.businessTypeId !== undefined) {
      const raw = body.businessTypeId;
      if (raw === null || raw === "") {
        data.businessType = { disconnect: true };
      } else {
        const businessTypeId = String(raw).trim();
        await this.shared.ensureDefaultBusinessTypes(companyId);
        const bt = await this.prisma.crmBusinessType.findFirst({
          where: { id: businessTypeId, companyId, deletedAt: null },
        });
        if (!bt) throw new BadRequestException("Invalid businessTypeId");
        data.businessType = { connect: { id: businessTypeId } };
      }
    }
    if (body.source !== undefined) {
      data.source = asEnum<CrmLeadSource>(body.source, LEAD_SOURCES, "source");
    }
    if (body.status !== undefined) {
      data.status = asEnum<CrmLeadStatus>(body.status, LEAD_STATUSES, "status");
    }
    if (body.tags !== undefined) data.tags = asStringArray(body.tags) ?? [];
    if (body.nextAction !== undefined) {
      data.nextAction = asEnum<CrmNextAction>(
        body.nextAction,
        NEXT_ACTIONS,
        "nextAction"
      );
    }
    if (body.nextFollowUpAt !== undefined) {
      data.nextFollowUpAt = asOptionalDate(body.nextFollowUpAt) ?? null;
      const meta = asLeadMetadata(data.metadata ?? current.metadata);
      data.metadata = clearFollowUpReminderMeta(meta);
    }
    if (body.notes !== undefined) data.notes = String(body.notes ?? "");
    if (body.lossReasonTypeId !== undefined) {
      data.lossReasonTypeId =
        typeof body.lossReasonTypeId === "string" && body.lossReasonTypeId
          ? body.lossReasonTypeId
          : null;
    }

    let ownerChanged = false;
    let previousOwner = current.ownerEmployeeId;
    if (body.ownerEmployeeId !== undefined) {
      assertCap(actor, "assign");
      const nextOwner =
        typeof body.ownerEmployeeId === "string" && body.ownerEmployeeId
          ? body.ownerEmployeeId
          : null;
      await this.shared.assertOwnerAssignable(companyId, actor, nextOwner);
      data.ownerEmployeeId = nextOwner;
      ownerChanged = nextOwner !== current.ownerEmployeeId;
      previousOwner = current.ownerEmployeeId;
    }

    let stageChanged = false;
    let previousStageId = current.stageId;
    if (body.stageId !== undefined) {
      const stageId = String(body.stageId);
      const patch: {
        stageId?: string;
        status?: CrmLeadStatus;
        convertedAt?: Date | null;
        lossReasonTypeId?: string | null;
      } = {
        stageId,
        lossReasonTypeId:
          body.lossReasonTypeId !== undefined
            ? (typeof body.lossReasonTypeId === "string" && body.lossReasonTypeId
                ? body.lossReasonTypeId
                : null)
            : current.lossReasonTypeId,
      };
      await this.shared.applyStageSideEffects(
        companyId,
        stageId,
        patch.lossReasonTypeId,
        patch
      );
      data.stage = { connect: { id: stageId } };
      if (patch.status) data.status = patch.status;
      if (patch.convertedAt !== undefined) data.convertedAt = patch.convertedAt;
      if (patch.lossReasonTypeId !== undefined) {
        data.lossReasonTypeId = patch.lossReasonTypeId;
      }
      stageChanged = stageId !== current.stageId;
      previousStageId = current.stageId;
      if (stageChanged && body.subStageId === undefined) {
        data.subStage = { disconnect: true };
      }
    }

    if (body.subStageId !== undefined) {
      const nextStageId =
        typeof body.stageId === "string" ? body.stageId : current.stageId;
      if (
        body.subStageId === null ||
        body.subStageId === "" ||
        body.subStageId === undefined
      ) {
        data.subStage = { disconnect: true };
      } else {
        const subStageId = String(body.subStageId);
        const sub = await this.prisma.crmSubStage.findFirst({
          where: {
            id: subStageId,
            companyId,
            stageId: nextStageId,
            deletedAt: null,
          },
        });
        if (!sub) throw new BadRequestException("Invalid subStageId");
        data.subStage = { connect: { id: subStageId } };
      }
    }

    const row = await this.prisma.crmLead.update({ where: { id }, data });
    const nameLabel = await this.shared.actorName(actor);

    if (stageChanged) {
      await this.recordStageChange(companyId, actor, {
        id,
        row,
        nameLabel,
        previousStageId,
      });
    }
    if (ownerChanged) {
      await this.recordOwnerChange(companyId, actor, {
        id,
        row,
        nameLabel,
        previousOwner,
      });
    }
    if (
      body.status !== undefined &&
      String(body.status) !== current.status &&
      !stageChanged
    ) {
      await this.recordStatusChange(companyId, actor, {
        id,
        row,
        nameLabel,
        previousStatus: current.status,
      });
    }
    if (!stageChanged && !ownerChanged) {
      await this.shared.writeHistory(companyId, {
        leadId: id,
        action: "lead_updated",
        actorId: actor.userId,
        actorName: nameLabel,
        note: `Updated lead ${row.name}`,
      });
      await writeActivity(this.prisma, {
        companyId,
        type: "crm_lead_updated",
        title: "CRM lead updated",
        description: row.name,
        employeeId: row.ownerEmployeeId ?? undefined,
        actorId: actor.userId,
      });
    }

    return mapLead(row);
  }

  private async recordStageChange(
    companyId: string,
    actor: Actor,
    ctx: {
      id: string;
      row: { name: string; stageId: string; ownerEmployeeId: string | null };
      nameLabel: string;
      previousStageId: string;
    }
  ) {
    await this.shared.writeHistory(companyId, {
      leadId: ctx.id,
      action: "stage_changed",
      actorId: actor.userId,
      actorName: ctx.nameLabel,
      note: `Stage changed for ${ctx.row.name}`,
      previousValue: ctx.previousStageId,
      newValue: ctx.row.stageId,
    });
    await this.shared.writeLeadActivity(companyId, {
      leadId: ctx.id,
      type: CrmActivityType.stage_change,
      title: "Stage changed",
      description: `${ctx.previousStageId} → ${ctx.row.stageId}`,
      actorEmployeeId: actor.employeeId,
      actorId: actor.userId,
    });
    await writeActivity(this.prisma, {
      companyId,
      type: "crm_stage_changed",
      title: "CRM lead stage changed",
      description: ctx.row.name,
      employeeId: ctx.row.ownerEmployeeId ?? undefined,
      actorId: actor.userId,
    });
  }

  private async recordOwnerChange(
    companyId: string,
    actor: Actor,
    ctx: {
      id: string;
      row: { name: string; ownerEmployeeId: string | null };
      nameLabel: string;
      previousOwner: string | null;
    }
  ) {
    await this.shared.writeHistory(companyId, {
      leadId: ctx.id,
      action: ctx.previousOwner ? "lead_reassigned" : "lead_assigned",
      actorId: actor.userId,
      actorName: ctx.nameLabel,
      note: `Owner changed for ${ctx.row.name}`,
      previousValue: ctx.previousOwner,
      newValue: ctx.row.ownerEmployeeId,
    });
    await this.shared.writeLeadActivity(companyId, {
      leadId: ctx.id,
      type: CrmActivityType.assignment,
      title: "Lead assigned",
      description: ctx.row.ownerEmployeeId ?? "unassigned",
      actorEmployeeId: actor.employeeId,
      actorId: actor.userId,
    });
    await writeActivity(this.prisma, {
      companyId,
      type: "crm_lead_assigned",
      title: "CRM lead assigned",
      description: ctx.row.name,
      employeeId: ctx.row.ownerEmployeeId ?? undefined,
      actorId: actor.userId,
    });
  }

  private async recordStatusChange(
    companyId: string,
    actor: Actor,
    ctx: {
      id: string;
      row: { name: string; status: string };
      nameLabel: string;
      previousStatus: string;
    }
  ) {
    await this.shared.writeHistory(companyId, {
      leadId: ctx.id,
      action: "status_changed",
      actorId: actor.userId,
      actorName: ctx.nameLabel,
      note: `Status changed for ${ctx.row.name}`,
      previousValue: ctx.previousStatus,
      newValue: ctx.row.status,
    });
    await this.shared.writeLeadActivity(companyId, {
      leadId: ctx.id,
      type: CrmActivityType.status_change,
      title: "Status changed",
      description: `${ctx.previousStatus} → ${ctx.row.status}`,
      actorEmployeeId: actor.employeeId,
      actorId: actor.userId,
    });
  }
}
