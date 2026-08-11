import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import {
  CrmActivityType,
  CrmLeadSource,
  CrmLeadStatus,
  CrmNextAction,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { writeActivity } from "../common/activity-writer";
import { assertCap, type Actor } from "./crm-access";
import { canCrm } from "../lib/crm-policies";
import {
  asEnum,
  asOptionalDate,
  asStringArray,
  LEAD_SOURCES,
  LEAD_STATUSES,
  NEXT_ACTIONS,
} from "./crm-input";
import { mapLead } from "./crm-mappers";
import { CrmSharedService } from "./crm-shared.service";

@Injectable()
export class CrmLeadCreateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shared: CrmSharedService
  ) {}

  async createLead(
    companyId: string,
    actor: Actor,
    body: Record<string, unknown>
  ) {
    assertCap(actor, "create");
    await this.shared.ensureDefaultStages(companyId);

    const name = String(body.name ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    if (!name) throw new BadRequestException("name is required");
    if (!phone) throw new BadRequestException("phone is required");

    let stageId = typeof body.stageId === "string" ? body.stageId : "";
    if (!stageId) {
      const first = await this.prisma.crmStage.findFirst({
        where: { companyId, deletedAt: null, active: true },
        orderBy: [{ sortOrder: "asc" }],
      });
      if (!first) throw new BadRequestException("No CRM stages configured");
      stageId = first.id;
    }

    let subStageId: string | null =
      typeof body.subStageId === "string" && body.subStageId.trim()
        ? body.subStageId.trim()
        : null;
    if (subStageId) {
      const sub = await this.prisma.crmSubStage.findFirst({
        where: { id: subStageId, companyId, stageId, deletedAt: null },
      });
      if (!sub) throw new BadRequestException("Invalid subStageId");
    }

    let ownerEmployeeId: string | null =
      typeof body.ownerEmployeeId === "string" && body.ownerEmployeeId
        ? body.ownerEmployeeId
        : null;
    if (!canCrm(actor.role, "assign", actor.permissions)) {
      if (!actor.employeeId) {
        throw new ForbiddenException("You can only create leads assigned to you");
      }
      ownerEmployeeId = actor.employeeId;
    }

    const lossReasonTypeId =
      typeof body.lossReasonTypeId === "string" && body.lossReasonTypeId
        ? body.lossReasonTypeId
        : null;

    const patch: {
      stageId: string;
      status?: CrmLeadStatus;
      convertedAt?: Date | null;
      lossReasonTypeId?: string | null;
    } = { stageId, lossReasonTypeId };
    await this.shared.applyStageSideEffects(
      companyId,
      stageId,
      lossReasonTypeId,
      patch
    );

    const nextFollowUpAt = asOptionalDate(body.nextFollowUpAt);
    let businessTypeId: string | null =
      typeof body.businessTypeId === "string" && body.businessTypeId.trim()
        ? body.businessTypeId.trim()
        : null;
    if (businessTypeId) {
      await this.shared.ensureDefaultBusinessTypes(companyId);
      const bt = await this.prisma.crmBusinessType.findFirst({
        where: { id: businessTypeId, companyId, deletedAt: null },
      });
      if (!bt) throw new BadRequestException("Invalid businessTypeId");
    }

    const now = new Date();
    const row = await this.prisma.crmLead.create({
      data: {
        companyId,
        name,
        phone,
        email: String(body.email ?? "").trim(),
        companyName: String(body.companyName ?? "").trim(),
        businessTypeId,
        source: asEnum<CrmLeadSource>(
          body.source,
          LEAD_SOURCES,
          "source",
          CrmLeadSource.other
        ),
        ownerEmployeeId,
        stageId: patch.stageId,
        subStageId,
        status: asEnum<CrmLeadStatus>(
          body.status ?? patch.status,
          LEAD_STATUSES,
          "status",
          CrmLeadStatus.active
        ),
        tags: asStringArray(body.tags) ?? [],
        nextAction: asEnum<CrmNextAction>(
          body.nextAction,
          NEXT_ACTIONS,
          "nextAction",
          CrmNextAction.none
        ),
        nextFollowUpAt: nextFollowUpAt === undefined ? null : nextFollowUpAt,
        lastActivityAt: now,
        lossReasonTypeId: patch.lossReasonTypeId ?? lossReasonTypeId,
        notes: String(body.notes ?? ""),
        convertedAt: patch.convertedAt ?? null,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      },
    });

    const nameLabel = await this.shared.actorName(actor);
    await this.shared.writeHistory(companyId, {
      leadId: row.id,
      action: "lead_created",
      actorId: actor.userId,
      actorName: nameLabel,
      note: `Created lead ${row.name}`,
      newValue: row.name,
    });
    await this.shared.writeLeadActivity(companyId, {
      leadId: row.id,
      type: CrmActivityType.created,
      title: "Lead created",
      description: row.name,
      actorEmployeeId: actor.employeeId,
      actorId: actor.userId,
      occurredAt: now,
    });
    await writeActivity(this.prisma, {
      companyId,
      type: "crm_lead_created",
      title: "CRM lead created",
      description: row.name,
      employeeId: ownerEmployeeId ?? undefined,
      actorId: actor.userId,
    });

    return mapLead(row);
  }
}
