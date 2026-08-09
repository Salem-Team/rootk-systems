import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { assertCap, type Actor } from "./crm-access";
import { mapFeedbackType } from "./crm-mappers";
import { CrmSharedService } from "./crm-shared.service";

@Injectable()
export class CrmFeedbackTypesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shared: CrmSharedService
  ) {}

  async listFeedbackTypes(companyId: string) {
    await this.shared.ensureDefaultFeedbackTypes(companyId);
    const rows = await this.prisma.crmFeedbackType.findMany({
      where: { companyId, deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return rows.map(mapFeedbackType);
  }

  async upsertFeedbackType(
    companyId: string,
    actor: Actor,
    body: Record<string, unknown>
  ) {
    assertCap(actor, "manage_feedback_types");
    const id = typeof body.id === "string" ? body.id : undefined;
    const name = String(body.name ?? "").trim();
    if (!name) throw new BadRequestException("Feedback type name is required");

    const data = {
      name,
      description: String(body.description ?? ""),
      sortOrder: Number(body.sortOrder ?? 0),
      active: body.active !== false,
      isLossReason: body.isLossReason === true,
      updatedBy: actor.userId,
    };

    if (id) {
      const current = await this.prisma.crmFeedbackType.findFirst({
        where: { id, companyId, deletedAt: null },
      });
      if (!current) throw new NotFoundException("Feedback type not found");
      const row = await this.prisma.crmFeedbackType.update({
        where: { id },
        data: { ...data, version: { increment: 1 } },
      });
      return mapFeedbackType(row);
    }

    const row = await this.prisma.crmFeedbackType.create({
      data: { companyId, ...data, createdBy: actor.userId },
    });
    return mapFeedbackType(row);
  }

  async deleteFeedbackType(companyId: string, actor: Actor, id: string) {
    assertCap(actor, "manage_feedback_types");
    const current = await this.prisma.crmFeedbackType.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!current) throw new NotFoundException("Feedback type not found");

    const inUse = await this.prisma.crmLeadFeedback.count({
      where: { companyId, feedbackTypeId: id, deletedAt: null },
    });
    if (inUse > 0) {
      throw new BadRequestException(
        "Cannot delete a feedback type that is in use"
      );
    }

    await this.prisma.crmFeedbackType.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isArchived: true,
        active: false,
        updatedBy: actor.userId,
        version: { increment: 1 },
      },
    });
    return { ok: true };
  }
}
