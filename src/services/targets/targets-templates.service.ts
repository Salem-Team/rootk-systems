import {
  deleteTargetTemplate as apiDeleteTemplate,
  fetchTargetTemplates,
  putTargetTemplate,
} from "@/api/targets.api";
import { isApiMode } from "@/lib/env";
import { enrichWithAudit, touchEntity } from "@/lib/entity";
import { NotFoundError } from "@/lib/errors";
import { createId } from "@/lib/id";
import { targetTemplateRepository } from "@/repositories";
import {
  targetTemplateSchema,
  type TargetTemplateInput,
} from "@/schemas/targets.schema";
import { fromError, ok } from "@/services/api-result";
import { getSessionUserId } from "@/stores/session-store";
import type { ApiResponse, TargetTemplate } from "@/types";
import { assertCap } from "./targets-shared";

export async function getTargetTemplates(): Promise<
  ApiResponse<TargetTemplate[]>
> {
  if (isApiMode()) return fetchTargetTemplates();
  try {
    return ok(await targetTemplateRepository.findAll());
  } catch (error) {
    return fromError(error, []);
  }
}

export async function saveTargetTemplate(
  input: TargetTemplateInput
): Promise<ApiResponse<TargetTemplate>> {
  if (isApiMode()) return putTargetTemplate(input);
  try {
    assertCap("manage_templates");
    const parsed = targetTemplateSchema.parse(input);
    const actorId = getSessionUserId();
    const items = parsed.items.map((item, index) => ({
      id: item.id ?? createId("tti"),
      companyId: "",
      templateId: parsed.id ?? "",
      typeId: item.typeId,
      quantity: item.quantity,
      unit: item.unit,
      weight: item.weight,
      sortOrder: item.sortOrder ?? index,
    }));

    if (parsed.id) {
      const current = await targetTemplateRepository.findById(parsed.id);
      if (!current) throw new NotFoundError("Template not found");
      const next = touchEntity(current, actorId, {
        name: parsed.name,
        description: parsed.description,
        categoryId: parsed.categoryId ?? null,
        active: parsed.active,
        items: items.map((i) => ({ ...i, templateId: parsed.id! })),
      });
      await targetTemplateRepository.update(parsed.id, next);
      return ok(next);
    }

    const id = createId("ttpl");
    const row = enrichWithAudit(
      {
        id,
        name: parsed.name,
        description: parsed.description,
        categoryId: parsed.categoryId ?? null,
        active: parsed.active,
        items: items.map((i) => ({ ...i, templateId: id })),
      },
      actorId
    );
    await targetTemplateRepository.create(row);
    return ok(row);
  } catch (error) {
    return fromError(error, {
      id: "",
      categoryId: null,
      name: "",
      description: "",
      active: true,
      items: [],
      companyId: "",
      createdAt: "",
      updatedAt: "",
      createdBy: "",
      updatedBy: "",
      deletedAt: null,
      isArchived: false,
      version: 0,
      metadata: {},
    });
  }
}

export async function removeTargetTemplate(
  id: string
): Promise<ApiResponse<{ ok: boolean }>> {
  if (isApiMode()) return apiDeleteTemplate(id);
  try {
    assertCap("manage_templates");
    await targetTemplateRepository.delete(id);
    return ok({ ok: true });
  } catch (error) {
    return fromError(error, { ok: false });
  }
}
