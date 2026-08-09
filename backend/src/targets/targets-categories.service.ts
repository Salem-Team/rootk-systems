import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { assertCap, type Actor } from "./targets-access";
import { mapCategory } from "./targets-mappers";

@Injectable()
export class TargetsCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  listCategories(companyId: string) {
    return this.prisma.targetCategory
      .findMany({
        where: { companyId, deletedAt: null },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      })
      .then((rows) => rows.map(mapCategory));
  }

  async upsertCategory(
    companyId: string,
    actor: Actor,
    body: Record<string, unknown>
  ) {
    assertCap(actor, "manage_categories");
    const id = typeof body.id === "string" ? body.id : undefined;
    const data = {
      name: String(body.name ?? "").trim(),
      color: String(body.color ?? "#082868"),
      icon: String(body.icon ?? "Target"),
      description: String(body.description ?? ""),
      active: body.active !== false,
      sortOrder: Number(body.sortOrder ?? 0),
      updatedBy: actor.userId,
    };
    if (!data.name) throw new BadRequestException("Category name is required");

    if (id) {
      const current = await this.prisma.targetCategory.findFirst({
        where: { id, companyId, deletedAt: null },
      });
      if (!current) throw new NotFoundException("Category not found");
      const row = await this.prisma.targetCategory.update({
        where: { id },
        data: { ...data, version: { increment: 1 } },
      });
      return mapCategory(row);
    }

    const row = await this.prisma.targetCategory.create({
      data: {
        companyId,
        ...data,
        createdBy: actor.userId,
      },
    });
    return mapCategory(row);
  }

  async deleteCategory(companyId: string, actor: Actor, id: string) {
    assertCap(actor, "manage_categories");
    const current = await this.prisma.targetCategory.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!current) throw new NotFoundException("Category not found");
    await this.prisma.targetCategory.update({
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
