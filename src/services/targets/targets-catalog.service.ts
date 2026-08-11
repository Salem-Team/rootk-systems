import {
  deleteTargetCategory as apiDeleteCategory,
  deleteTargetType as apiDeleteType,
  fetchTargetCategories,
  fetchTargetTypes,
  putTargetCategory,
  putTargetType,
} from "@/api/targets.api";
import { isApiMode } from "@/lib/env";
import { touchEntity, enrichWithAudit } from "@/lib/entity";
import { NotFoundError } from "@/lib/errors";
import { createId } from "@/lib/id";
import {
  targetCategoryRepository,
  targetTypeRepository,
} from "@/repositories";
import {
  targetCategorySchema,
  targetTypeSchema,
  type TargetCategoryInput,
  type TargetTypeInput,
} from "@/schemas/targets.schema";
import { fromError, ok } from "@/services/api-result";
import { getSessionUserId } from "@/stores/session-store";
import type { ApiResponse, TargetCategory, TargetType } from "@/types";
import { assertCap } from "./targets-shared";

// ── Categories ────────────────────────────────────────────────────────────

export async function getTargetCategories(): Promise<
  ApiResponse<TargetCategory[]>
> {
  if (isApiMode()) return fetchTargetCategories();
  try {
    await import("@/services/organic-ads/catalog").then((m) =>
      m.ensureOrganicAdsCatalogLocal()
    );
    const rows = await targetCategoryRepository.findAll();
    return ok(
      rows.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    );
  } catch (error) {
    return fromError(error, []);
  }
}

export async function saveTargetCategory(
  input: TargetCategoryInput
): Promise<ApiResponse<TargetCategory>> {
  if (isApiMode()) return putTargetCategory(input);
  try {
    assertCap("manage_categories");
    const parsed = targetCategorySchema.parse(input);
    const actorId = getSessionUserId();
    if (parsed.id) {
      const current = await targetCategoryRepository.findById(parsed.id);
      if (!current) throw new NotFoundError("Category not found");
      const next = touchEntity(current, actorId, parsed);
      await targetCategoryRepository.update(parsed.id, next);
      return ok(next);
    }
    const row = enrichWithAudit(
      {
        id: createId("tcat"),
        name: parsed.name,
        color: parsed.color,
        icon: parsed.icon,
        description: parsed.description,
        active: parsed.active,
        sortOrder: parsed.sortOrder,
      },
      actorId
    );
    await targetCategoryRepository.create(row);
    return ok(row);
  } catch (error) {
    return fromError(error, {
      id: "",
      name: "",
      color: "#082868",
      icon: "Target",
      description: "",
      active: true,
      sortOrder: 0,
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

export async function removeTargetCategory(
  id: string
): Promise<ApiResponse<{ ok: boolean }>> {
  if (isApiMode()) return apiDeleteCategory(id);
  try {
    assertCap("manage_categories");
    await targetCategoryRepository.delete(id);
    return ok({ ok: true });
  } catch (error) {
    return fromError(error, { ok: false });
  }
}

// ── Types ─────────────────────────────────────────────────────────────────

export async function getTargetTypes(
  categoryId?: string
): Promise<ApiResponse<TargetType[]>> {
  if (isApiMode()) return fetchTargetTypes(categoryId);
  try {
    await import("@/services/organic-ads/catalog").then((m) =>
      m.ensureOrganicAdsCatalogLocal()
    );
    const rows = await targetTypeRepository.findAll();
    const filtered = categoryId
      ? rows.filter((t) => t.categoryId === categoryId)
      : rows;
    return ok(
      filtered.sort(
        (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
      )
    );
  } catch (error) {
    return fromError(error, []);
  }
}

export async function saveTargetType(
  input: TargetTypeInput
): Promise<ApiResponse<TargetType>> {
  if (isApiMode()) return putTargetType(input);
  try {
    assertCap("manage_types");
    const parsed = targetTypeSchema.parse(input);
    const actorId = getSessionUserId();
    if (parsed.id) {
      const current = await targetTypeRepository.findById(parsed.id);
      if (!current) throw new NotFoundError("Type not found");
      const next = touchEntity(current, actorId, parsed);
      await targetTypeRepository.update(parsed.id, next);
      return ok(next);
    }
    const row = enrichWithAudit(
      {
        id: createId("ttype"),
        categoryId: parsed.categoryId,
        name: parsed.name,
        description: parsed.description,
        unit: parsed.unit,
        taskTitleTemplate: parsed.taskTitleTemplate,
        active: parsed.active,
        sortOrder: parsed.sortOrder,
      },
      actorId
    );
    await targetTypeRepository.create(row);
    return ok(row);
  } catch (error) {
    return fromError(error, {
      id: "",
      categoryId: "",
      name: "",
      description: "",
      unit: "unit",
      taskTitleTemplate: "{name} #{n}",
      active: true,
      sortOrder: 0,
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

export async function removeTargetType(
  id: string
): Promise<ApiResponse<{ ok: boolean }>> {
  if (isApiMode()) return apiDeleteType(id);
  try {
    assertCap("manage_types");
    await targetTypeRepository.delete(id);
    return ok({ ok: true });
  } catch (error) {
    return fromError(error, { ok: false });
  }
}
