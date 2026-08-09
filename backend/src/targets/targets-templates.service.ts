import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { auditFields } from "../common/mappers";
import { assertCap, type Actor } from "./targets-access";
import { mapTemplateItem } from "./targets-mappers";

@Injectable()
export class TargetsTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async listTemplates(companyId: string) {
    const rows = await this.prisma.targetTemplate.findMany({
      where: { companyId, deletedAt: null },
      include: { items: { orderBy: { sortOrder: "asc" } } },
      orderBy: { name: "asc" },
    });
    return rows.map((row) => ({
      id: row.id,
      categoryId: row.categoryId,
      name: row.name,
      description: row.description,
      active: row.active,
      items: row.items.map(mapTemplateItem),
      ...auditFields(row),
    }));
  }

  async upsertTemplate(
    companyId: string,
    actor: Actor,
    body: Record<string, unknown>
  ) {
    assertCap(actor, "manage_templates");
    const id = typeof body.id === "string" ? body.id : undefined;
    const name = String(body.name ?? "").trim();
    if (!name) throw new BadRequestException("Template name is required");
    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) {
      throw new BadRequestException("Template requires at least one item");
    }

    const templateData = {
      name,
      description: String(body.description ?? ""),
      categoryId:
        body.categoryId === null || body.categoryId === undefined
          ? null
          : String(body.categoryId),
      active: body.active !== false,
      updatedBy: actor.userId,
    };

    const normalizedItems = items.map((raw, index) => {
      const item = raw as Record<string, unknown>;
      return {
        companyId,
        typeId: String(item.typeId ?? ""),
        quantity: Math.max(1, Number(item.quantity ?? 1)),
        unit: String(item.unit ?? "unit"),
        weight: Number(item.weight ?? 1),
        sortOrder: Number(item.sortOrder ?? index),
      };
    });
    if (normalizedItems.some((i) => !i.typeId)) {
      throw new BadRequestException("Each template item needs typeId");
    }

    return this.prisma.$transaction(async (tx) => {
      let templateId = id;
      if (templateId) {
        const current = await tx.targetTemplate.findFirst({
          where: { id: templateId, companyId, deletedAt: null },
        });
        if (!current) throw new NotFoundException("Template not found");
        await tx.targetTemplate.update({
          where: { id: templateId },
          data: { ...templateData, version: { increment: 1 } },
        });
        await tx.targetTemplateItem.deleteMany({ where: { templateId } });
      } else {
        const created = await tx.targetTemplate.create({
          data: {
            companyId,
            ...templateData,
            createdBy: actor.userId,
          },
        });
        templateId = created.id;
      }

      await tx.targetTemplateItem.createMany({
        data: normalizedItems.map((item) => ({
          ...item,
          templateId: templateId!,
        })),
      });

      const row = await tx.targetTemplate.findFirstOrThrow({
        where: { id: templateId },
        include: { items: { orderBy: { sortOrder: "asc" } } },
      });
      return {
        id: row.id,
        categoryId: row.categoryId,
        name: row.name,
        description: row.description,
        active: row.active,
        items: row.items.map(mapTemplateItem),
        ...auditFields(row),
      };
    });
  }

  async deleteTemplate(companyId: string, actor: Actor, id: string) {
    assertCap(actor, "manage_templates");
    const current = await this.prisma.targetTemplate.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!current) throw new NotFoundException("Template not found");
    await this.prisma.targetTemplate.update({
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
