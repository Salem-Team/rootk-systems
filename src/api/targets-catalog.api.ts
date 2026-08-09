import { api } from "@/api/http";
import { API_ROUTES, toQuery } from "@/api/routes";
import type {
  ApiResponse,
  TargetCategory,
  TargetTemplate,
  TargetType,
} from "@/types";
import type {
  TargetCategoryInput,
  TargetTemplateInput,
  TargetTypeInput,
} from "@/schemas/targets.schema";

export function fetchTargetCategories(): Promise<ApiResponse<TargetCategory[]>> {
  return api.getList(API_ROUTES.targets.categories);
}

export function putTargetCategory(
  input: TargetCategoryInput
): Promise<ApiResponse<TargetCategory>> {
  return api.put(API_ROUTES.targets.categories, input, {
    id: input.id ?? "",
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

export function deleteTargetCategory(id: string): Promise<ApiResponse<{ ok: boolean }>> {
  return api.delete(API_ROUTES.targets.categoryById(id), { ok: false });
}

export function fetchTargetTypes(
  categoryId?: string
): Promise<ApiResponse<TargetType[]>> {
  return api.getList(
    `${API_ROUTES.targets.types}${toQuery({ categoryId })}`
  );
}

export function putTargetType(
  input: TargetTypeInput
): Promise<ApiResponse<TargetType>> {
  return api.put(API_ROUTES.targets.types, input, {
    id: input.id ?? "",
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

export function deleteTargetType(id: string): Promise<ApiResponse<{ ok: boolean }>> {
  return api.delete(API_ROUTES.targets.typeById(id), { ok: false });
}

export function fetchTargetTemplates(): Promise<ApiResponse<TargetTemplate[]>> {
  return api.getList(API_ROUTES.targets.templates);
}

export function putTargetTemplate(
  input: TargetTemplateInput
): Promise<ApiResponse<TargetTemplate>> {
  return api.put(API_ROUTES.targets.templates, input, {
    id: input.id ?? "",
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

export function deleteTargetTemplate(id: string): Promise<ApiResponse<{ ok: boolean }>> {
  return api.delete(API_ROUTES.targets.templateById(id), { ok: false });
}
