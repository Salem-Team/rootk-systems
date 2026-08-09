import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { assertCap, type Actor } from "./crm-access";
import { mapBusinessType } from "./crm-mappers";
import { CrmSharedService } from "./crm-shared.service";

@Injectable()
export class CrmBusinessTypesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shared: CrmSharedService
  ) {}

  async listBusinessTypes(companyId: string) {
    await this.shared.ensureDefaultBusinessTypes(companyId);
    const rows = await this.prisma.crmBusinessType.findMany({
      where: { companyId, deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return rows.map(mapBusinessType);
  }

  async upsertBusinessType(
    companyId: string,
    actor: Actor,
    body: Record<string, unknown>
  ) {
    assertCap(actor, "manage_business_types");
    const id = typeof body.id === "string" ? body.id : undefined;
    const name = String(body.name ?? "").trim();
    if (!name) throw new BadRequestException("Business type name is required");

    const data = {
      name,
      description: String(body.description ?? ""),
      sortOrder: Number(body.sortOrder ?? 0),
      active: body.active !== false,
      updatedBy: actor.userId,
    };

    if (id) {
      const current = await this.prisma.crmBusinessType.findFirst({
        where: { id, companyId, deletedAt: null },
      });
      if (!current) throw new NotFoundException("Business type not found");
      const row = await this.prisma.crmBusinessType.update({
        where: { id },
        data: { ...data, version: { increment: 1 } },
      });
      return mapBusinessType(row);
    }

    const row = await this.prisma.crmBusinessType.create({
      data: { companyId, ...data, createdBy: actor.userId },
    });
    return mapBusinessType(row);
  }

  async deleteBusinessType(companyId: string, actor: Actor, id: string) {
    assertCap(actor, "manage_business_types");
    const current = await this.prisma.crmBusinessType.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!current) throw new NotFoundException("Business type not found");

    const inUse = await this.prisma.crmLead.count({
      where: { companyId, businessTypeId: id, deletedAt: null },
    });
    if (inUse > 0) {
      throw new BadRequestException(
        "Cannot delete a business type that is in use"
      );
    }

    await this.prisma.crmBusinessType.update({
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
