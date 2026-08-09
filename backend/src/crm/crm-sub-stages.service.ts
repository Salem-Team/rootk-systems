import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { writeActivity } from "../common/activity-writer";
import { assertCap, type Actor } from "./crm-access";
import { mapSubStage } from "./crm-mappers";
import { CrmSharedService } from "./crm-shared.service";

@Injectable()
export class CrmSubStagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shared: CrmSharedService
  ) {}

  async listByStage(companyId: string, stageId: string) {
    const rows = await this.prisma.crmSubStage.findMany({
      where: { companyId, stageId, deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return rows.map(mapSubStage);
  }

  async upsertSubStage(
    companyId: string,
    actor: Actor,
    body: Record<string, unknown>
  ) {
    assertCap(actor, "manage_stages");
    const id = typeof body.id === "string" ? body.id : undefined;
    const stageId = String(body.stageId ?? "").trim();
    const name = String(body.name ?? "").trim();
    if (!stageId) throw new BadRequestException("stageId is required");
    if (!name) throw new BadRequestException("Sub-stage name is required");

    const parent = await this.prisma.crmStage.findFirst({
      where: { id: stageId, companyId, deletedAt: null },
    });
    if (!parent) throw new NotFoundException("Stage not found");

    const data = {
      stageId,
      name,
      description: String(body.description ?? ""),
      sortOrder: Number(body.sortOrder ?? 0),
      active: body.active !== false,
      updatedBy: actor.userId,
    };

    if (id) {
      const current = await this.prisma.crmSubStage.findFirst({
        where: { id, companyId, deletedAt: null },
      });
      if (!current) throw new NotFoundException("Sub-stage not found");
      const row = await this.prisma.crmSubStage.update({
        where: { id },
        data: { ...data, version: { increment: 1 } },
      });
      await writeActivity(this.prisma, {
        companyId,
        type: "crm_sub_stage_updated",
        title: "CRM sub-stage updated",
        description: row.name,
        actorId: actor.userId,
      });
      return mapSubStage(row);
    }

    const row = await this.prisma.crmSubStage.create({
      data: { companyId, ...data, createdBy: actor.userId },
    });
    await writeActivity(this.prisma, {
      companyId,
      type: "crm_sub_stage_created",
      title: "CRM sub-stage created",
      description: row.name,
      actorId: actor.userId,
    });
    return mapSubStage(row);
  }

  async reorderSubStages(
    companyId: string,
    actor: Actor,
    body: Record<string, unknown>
  ) {
    assertCap(actor, "manage_stages");
    const stageId = String(body.stageId ?? "").trim();
    const ids = Array.isArray(body.ids) ? body.ids.map((v) => String(v)) : [];
    if (!stageId) throw new BadRequestException("stageId is required");
    if (ids.length === 0) {
      throw new BadRequestException("ids array is required");
    }

    const rows = await this.prisma.crmSubStage.findMany({
      where: { companyId, stageId, deletedAt: null, id: { in: ids } },
    });
    if (rows.length !== ids.length) {
      throw new BadRequestException("One or more sub-stage ids are invalid");
    }

    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.crmSubStage.update({
          where: { id },
          data: {
            sortOrder: index,
            updatedBy: actor.userId,
            version: { increment: 1 },
          },
        })
      )
    );

    return this.listByStage(companyId, stageId);
  }

  async deleteSubStage(companyId: string, actor: Actor, id: string) {
    assertCap(actor, "manage_stages");
    const sub = await this.prisma.crmSubStage.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!sub) throw new NotFoundException("Sub-stage not found");

    await this.prisma.crmLead.updateMany({
      where: { companyId, subStageId: id, deletedAt: null },
      data: { subStageId: null, updatedBy: actor.userId },
    });

    await this.prisma.crmSubStage.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isArchived: true,
        active: false,
        updatedBy: actor.userId,
        version: { increment: 1 },
      },
    });

    await writeActivity(this.prisma, {
      companyId,
      type: "crm_sub_stage_deleted",
      title: "CRM sub-stage deleted",
      description: sub.name,
      actorId: actor.userId,
    });

    return { ok: true };
  }
}
