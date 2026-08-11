import { fetchTargetTypes } from "@/api/targets.api";
import { isApiMode } from "@/lib/env";
import { ValidationError } from "@/lib/errors";
import {
  defaultTargetWindow,
  toStorageIso,
} from "@/lib/flexible-datetime";
import {
  clampOrganicAdsQuantity,
  isOrganicAdsType,
} from "@/lib/organic-ads-task-match";
import { fromError } from "@/services/api-result";
import { assignTarget } from "@/services/targets/targets-assign.service";
import type { ApiResponse, PerformanceTarget } from "@/types";
import type { TargetPriority } from "@/types/targets";
import { ensureOrganicAdsCatalogLocal } from "./catalog";

export interface AssignOrganicAdsQuotaInput {
  title: string;
  description?: string;
  quantity: number;
  assigneeIds: string[];
  dueDate?: string;
  priority?: TargetPriority;
  notes?: string;
}

function mapTaskPriority(priority?: string): TargetPriority {
  if (priority === "high" || priority === "critical") return "high";
  if (priority === "low") return "low";
  return "medium";
}

export async function assignOrganicAdsQuota(
  input: AssignOrganicAdsQuotaInput
): Promise<ApiResponse<PerformanceTarget>> {
  try {
    const title = input.title.trim();
    if (!title) throw new ValidationError("Title is required");
    if (input.assigneeIds.length === 0) {
      throw new ValidationError("Select at least one assignee");
    }
    const quantity = clampOrganicAdsQuantity(input.quantity);
    const window = defaultTargetWindow();
    const startIso = toStorageIso(window.start, "start");
    const endIso = input.dueDate?.trim()
      ? toStorageIso(input.dueDate, "end")
      : toStorageIso(window.end, "end");

    const catalog = isApiMode()
      ? await resolveApiOrganicAdsType()
      : await ensureOrganicAdsCatalogLocal();

    return assignTarget({
      title,
      description: input.description?.trim() ?? "",
      categoryId: catalog.category.id,
      typeId: catalog.type.id,
      quantity,
      unit: catalog.type.unit || "ads",
      startDate: startIso,
      endDate: endIso,
      priority: mapTaskPriority(input.priority),
      weight: 1,
      assigneeScope: input.assigneeIds.length > 1 ? "multi" : "employee",
      assigneeIds: input.assigneeIds,
      department: "",
      branch: "",
      roleKey: "",
      ownerId: "",
      notes: input.notes?.trim() ?? "",
      status: "assigned",
      generateTasks: true,
    });
  } catch (error) {
    return fromError(error, {
      id: "",
      title: "",
      description: "",
      categoryId: "",
      typeId: "",
      templateId: null,
      quantity: 0,
      unit: "ads",
      completedQuantity: 0,
      startDate: "",
      endDate: "",
      priority: "medium",
      weight: 1,
      assigneeScope: "employee",
      assigneeIds: [],
      department: "",
      branch: "",
      roleKey: "",
      ownerId: "",
      status: "draft",
      health: "average",
      riskLevel: "low",
      notes: "",
      expectedCompletion: null,
      performanceScore: 0,
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

async function resolveApiOrganicAdsType() {
  const typesRes = await fetchTargetTypes();
  if (!typesRes.success) {
    throw new ValidationError(typesRes.message || "Could not load target types");
  }
  const type = typesRes.data.find((t) => isOrganicAdsType(t) && t.active);
  if (!type) {
    throw new ValidationError("Organic Ads target type is not available");
  }
  return {
    category: { id: type.categoryId },
    type,
  };
}
