import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CrmStageCategory } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { writeActivity } from "../common/activity-writer";
import { assertCap, type Actor } from "./crm-access";
import { DEFAULT_STAGE_COLOR } from "./crm-defaults";
import { asEnum, STAGE_CATEGORIES } from "./crm-input";
import { mapStage } from "./crm-mappers";
import { CrmSharedService } from "./crm-shared.service";

@Injectable()
export class CrmStagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shared: CrmSharedService
  ) {}

  async listStages(companyId: string) {
    await this.shared.ensureDefaultStages(companyId);
    const rows = await this.prisma.crmStage.findMany({
      where: { companyId, deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        subStages: {
          where: { deletedAt: null },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        },
      },
    });
    return rows.map((row) => mapStage(row, row.subStages));
  }

  async upsertStage(
    companyId: string,
    actor: Actor,
    body: Record<string, unknown>
  ) {
    assertCap(actor, "manage_stages");
    const id = typeof body.id === "string" ? body.id : undefined;
    const name = String(body.name ?? "").trim();
    if (!name) throw new BadRequestException("Stage name is required");

    const data = {
      name,
      description: String(body.description ?? ""),
      color: String(body.color ?? DEFAULT_STAGE_COLOR),
      sortOrder: Number(body.sortOrder ?? 0),
      active: body.active !== false,
      conversionProbability:
        body.conversionProbability === null ||
        body.conversionProbability === undefined ||
        body.conversionProbability === ""
          ? null
          : Number(body.conversionProbability),
      category: asEnum<CrmStageCategory>(
        body.category,
        STAGE_CATEGORIES,
        "category",
        CrmStageCategory.open
      ),
      updatedBy: actor.userId,
    };

    if (id) {
      const current = await this.prisma.crmStage.findFirst({
        where: { id, companyId, deletedAt: null },
      });
      if (!current) throw new NotFoundException("Stage not found");
      const row = await this.prisma.crmStage.update({
        where: { id },
        data: { ...data, version: { increment: 1 } },
      });
      await this.shared.writeHistory(companyId, {
        action: "stage_updated",
        actorId: actor.userId,
        actorName: await this.shared.actorName(actor),
        note: `Updated stage ${row.name}`,
        previousValue: current.name,
        newValue: row.name,
      });
      await writeActivity(this.prisma, {
        companyId,
        type: "crm_stage_updated",
        title: "CRM stage updated",
        description: row.name,
        actorId: actor.userId,
      });
      return mapStage(row);
    }

    const row = await this.prisma.crmStage.create({
      data: { companyId, ...data, createdBy: actor.userId },
    });
    await this.shared.writeHistory(companyId, {
      action: "stage_created",
      actorId: actor.userId,
      actorName: await this.shared.actorName(actor),
      note: `Created stage ${row.name}`,
      newValue: row.name,
    });
    await writeActivity(this.prisma, {
      companyId,
      type: "crm_stage_created",
      title: "CRM stage created",
      description: row.name,
      actorId: actor.userId,
    });
    return mapStage(row);
  }

  async reorderStages(
    companyId: string,
    actor: Actor,
    body: Record<string, unknown>
  ) {
    assertCap(actor, "manage_stages");
    const ids = Array.isArray(body.ids) ? body.ids.map((v) => String(v)) : [];
    if (ids.length === 0) {
      throw new BadRequestException("ids array is required");
    }

    const stages = await this.prisma.crmStage.findMany({
      where: { companyId, deletedAt: null, id: { in: ids } },
    });
    if (stages.length !== ids.length) {
      throw new BadRequestException("One or more stage ids are invalid");
    }

    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.crmStage.update({
          where: { id },
          data: {
            sortOrder: index,
            updatedBy: actor.userId,
            version: { increment: 1 },
          },
        })
      )
    );

    return this.listStages(companyId);
  }

  async deleteStage(
    companyId: string,
    actor: Actor,
    id: string,
    moveToStageId?: string
  ) {
    assertCap(actor, "manage_stages");
    const stage = await this.prisma.crmStage.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!stage) throw new NotFoundException("Stage not found");

    const leadCount = await this.prisma.crmLead.count({
      where: { companyId, stageId: id, deletedAt: null },
    });

    if (leadCount > 0) {
      if (!moveToStageId) {
        throw new BadRequestException({
          message: `This stage contains ${leadCount} leads. Move them before deleting.`,
          code: "STAGE_HAS_LEADS",
          details: { leadCount },
        });
      }
      if (moveToStageId === id) {
        throw new BadRequestException("moveToStageId must be a different stage");
      }
      const target = await this.prisma.crmStage.findFirst({
        where: { id: moveToStageId, companyId, deletedAt: null },
      });
      if (!target) throw new NotFoundException("Target stage not found");

      await this.prisma.crmLead.updateMany({
        where: { companyId, stageId: id, deletedAt: null },
        data: {
          stageId: moveToStageId,
          subStageId: null,
          updatedBy: actor.userId,
        },
      });
    }

    await this.prisma.crmSubStage.updateMany({
      where: { companyId, stageId: id, deletedAt: null },
      data: {
        deletedAt: new Date(),
        isArchived: true,
        active: false,
        updatedBy: actor.userId,
      },
    });

    await this.prisma.crmStage.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isArchived: true,
        active: false,
        updatedBy: actor.userId,
        version: { increment: 1 },
      },
    });

    await this.shared.writeHistory(companyId, {
      action: "stage_deleted",
      actorId: actor.userId,
      actorName: await this.shared.actorName(actor),
      note: `Deleted stage ${stage.name}`,
      previousValue: stage.name,
      newValue: moveToStageId ?? null,
    });
    await writeActivity(this.prisma, {
      companyId,
      type: "crm_stage_deleted",
      title: "CRM stage deleted",
      description: stage.name,
      actorId: actor.userId,
    });

    return { ok: true };
  }
}
