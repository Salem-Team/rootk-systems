import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  ORGANIC_ADS_TASK_TITLE_TEMPLATE,
  ORGANIC_ADS_TYPE_NAME,
  ORGANIC_ADS_UNIT,
  isOrganicAdsType,
} from "./organic-ads-task-match";

const MARKETING_NAMES = ["marketing", "تسويق"];

export async function ensureOrganicAdsCatalog(
  prisma: PrismaService,
  companyId: string,
  actorId = "system"
): Promise<{ categoryId: string; typeId: string }> {
  const [categories, types] = await Promise.all([
    prisma.targetCategory.findMany({
      where: { companyId, deletedAt: null },
    }),
    prisma.targetType.findMany({
      where: { companyId, deletedAt: null },
    }),
  ]);

  let category =
    categories.find((c) => MARKETING_NAMES.includes(c.name.trim().toLowerCase())) ??
    categories.find((c) => c.icon === "Megaphone") ??
    null;

  if (!category) {
    category = await prisma.targetCategory.create({
      data: {
        companyId,
        name: "Marketing",
        color: "#B45309",
        icon: "Megaphone",
        description: "Campaigns and organic advertising",
        active: true,
        sortOrder: 90,
        createdBy: actorId,
        updatedBy: actorId,
      },
    });
  }

  let type = types.find((t) => isOrganicAdsType(t)) ?? null;

  if (!type) {
    type = await prisma.targetType.create({
      data: {
        companyId,
        categoryId: category.id,
        name: ORGANIC_ADS_TYPE_NAME,
        description: "Published organic advertisements",
        unit: ORGANIC_ADS_UNIT,
        taskTitleTemplate: ORGANIC_ADS_TASK_TITLE_TEMPLATE,
        active: true,
        sortOrder: 20,
        metadata: { organicAds: true } as Prisma.InputJsonValue,
        createdBy: actorId,
        updatedBy: actorId,
      },
    });
  }

  return { categoryId: type.categoryId, typeId: type.id };
}
