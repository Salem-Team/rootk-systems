import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ensureOrganicAdsCatalog } from "../lib/organic-ads-catalog";
import { assertCap, type Actor } from "./targets-access";
import { mapType } from "./targets-mappers";

@Injectable()
export class TargetsTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async listTypes(companyId: string, categoryId?: string) {
    await ensureOrganicAdsCatalog(this.prisma, companyId);
    const rows = await this.prisma.targetType.findMany({
      where: {
        companyId,
        deletedAt: null,
        ...(categoryId ? { categoryId } : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return rows.map(mapType);
  }

  async upsertType(
    companyId: string,
    actor: Actor,
    body: Record<string, unknown>
  ) {
    assertCap(actor, "manage_types");
    const id = typeof body.id === "string" ? body.id : undefined;
    const categoryId = String(body.categoryId ?? "");
    if (!categoryId) throw new BadRequestException("categoryId is required");
    const cat = await this.prisma.targetCategory.findFirst({
      where: { id: categoryId, companyId, deletedAt: null },
    });
    if (!cat) throw new NotFoundException("Category not found");

    const data = {
      categoryId,
      name: String(body.name ?? "").trim(),
      description: String(body.description ?? ""),
      unit: String(body.unit ?? "unit"),
      taskTitleTemplate: String(body.taskTitleTemplate ?? "{name} #{n}"),
      active: body.active !== false,
      sortOrder: Number(body.sortOrder ?? 0),
      updatedBy: actor.userId,
    };
    if (!data.name) throw new BadRequestException("Type name is required");

    if (id) {
      const current = await this.prisma.targetType.findFirst({
        where: { id, companyId, deletedAt: null },
      });
      if (!current) throw new NotFoundException("Type not found");
      const row = await this.prisma.targetType.update({
        where: { id },
        data: { ...data, version: { increment: 1 } },
      });
      return mapType(row);
    }

    const row = await this.prisma.targetType.create({
      data: { companyId, ...data, createdBy: actor.userId },
    });
    return mapType(row);
  }

  async deleteType(companyId: string, actor: Actor, id: string) {
    assertCap(actor, "manage_types");
    const current = await this.prisma.targetType.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!current) throw new NotFoundException("Type not found");
    await this.prisma.targetType.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isArchived: true,
        updatedBy: actor.userId,
        version: { increment: 1 },
      },
    });
    return { ok: true };
  }
}
