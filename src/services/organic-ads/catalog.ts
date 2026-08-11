import { enrichWithAudit } from "@/lib/entity";
import {
  ORGANIC_ADS_LOCAL_CATEGORY_ID,
  ORGANIC_ADS_LOCAL_TEMPLATE_ID,
  ORGANIC_ADS_LOCAL_TYPE_ID,
  ORGANIC_ADS_TASK_TITLE_TEMPLATE,
  ORGANIC_ADS_TYPE_NAME,
  ORGANIC_ADS_UNIT,
  isOrganicAdsType,
} from "@/lib/organic-ads-task-match";
import {
  targetCategoryRepository,
  targetTemplateRepository,
  targetTypeRepository,
} from "@/repositories";
import { getSessionUserId } from "@/stores/session-store";
import type { TargetCategory, TargetType } from "@/types";

const MARKETING_NAMES = ["marketing", "تسويق"];

export async function ensureOrganicAdsCatalogLocal(): Promise<{
  category: TargetCategory;
  type: TargetType;
}> {
  const actorId = getSessionUserId() || "system";
  const [categories, types] = await Promise.all([
    targetCategoryRepository.findAll(),
    targetTypeRepository.findAll(),
  ]);

  let category =
    categories.find((c) => c.id === ORGANIC_ADS_LOCAL_CATEGORY_ID) ??
    categories.find((c) => MARKETING_NAMES.includes(c.name.trim().toLowerCase())) ??
    categories.find((c) => c.icon === "Megaphone") ??
    null;

  if (!category) {
    category = enrichWithAudit(
      {
        id: ORGANIC_ADS_LOCAL_CATEGORY_ID,
        name: "Marketing",
        color: "#B45309",
        icon: "Megaphone",
        description: "Campaigns and organic advertising",
        active: true,
        sortOrder: 90,
      },
      actorId
    );
    await targetCategoryRepository.create(category);
  }

  let type =
    types.find((t) => t.id === ORGANIC_ADS_LOCAL_TYPE_ID) ??
    types.find((t) => isOrganicAdsType(t)) ??
    null;

  if (!type) {
    type = enrichWithAudit(
      {
        id: ORGANIC_ADS_LOCAL_TYPE_ID,
        categoryId: category.id,
        name: ORGANIC_ADS_TYPE_NAME,
        description: "Published organic advertisements",
        unit: ORGANIC_ADS_UNIT,
        taskTitleTemplate: ORGANIC_ADS_TASK_TITLE_TEMPLATE,
        active: true,
        sortOrder: 20,
        metadata: { organicAds: true },
      },
      actorId
    );
    await targetTypeRepository.create(type);
  }

  const templates = await targetTemplateRepository.findAll();
  if (!templates.some((tpl) => tpl.id === ORGANIC_ADS_LOCAL_TEMPLATE_ID)) {
    await targetTemplateRepository.create(
      enrichWithAudit(
        {
          id: ORGANIC_ADS_LOCAL_TEMPLATE_ID,
          categoryId: category.id,
          name: "Weekly Organic Ads",
          description: "Standard weekly organic advertising quota",
          active: true,
          items: [
            {
              id: "tti-organic-ads",
              companyId: "",
              templateId: ORGANIC_ADS_LOCAL_TEMPLATE_ID,
              typeId: type.id,
              quantity: 5,
              unit: ORGANIC_ADS_UNIT,
              weight: 1,
              sortOrder: 0,
            },
          ],
        },
        actorId
      )
    );
  }

  return { category, type };
}
