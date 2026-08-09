import { api } from "@/api/http";
import { API_ROUTES, toQuery } from "@/api/routes";
import type {
  ApiResponse,
  PerformanceTarget,
  TargetDashboardStats,
  TargetFilters,
} from "@/types";
import type { AssignTargetInput } from "@/schemas/targets.schema";

export * from "./targets-catalog.api";
export * from "./targets-warnings.api";

function emptyTarget(id = ""): PerformanceTarget {
  return {
    id,
    title: "",
    description: "",
    categoryId: "",
    typeId: "",
    templateId: null,
    quantity: 0,
    unit: "unit",
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
  };
}

export function fetchTargets(
  filters: TargetFilters = {}
): Promise<ApiResponse<PerformanceTarget[]>> {
  return api.getList(
    `${API_ROUTES.targets.root}${toQuery({
      employeeId: filters.employeeId,
      department: filters.department,
      branch: filters.branch,
      roleKey: filters.roleKey,
      categoryId: filters.categoryId,
      typeId: filters.typeId,
      priority: filters.priority,
      status: filters.status,
      riskLevel: filters.riskLevel,
      createdBy: filters.createdBy,
      delayedOnly: filters.delayedOnly,
      completedOnly: filters.completedOnly,
      hasWarning: filters.hasWarning,
      search: filters.search,
      minProgress: filters.minProgress,
      maxProgress: filters.maxProgress,
    })}`
  );
}

export function fetchTargetById(
  id: string
): Promise<ApiResponse<PerformanceTarget | null>> {
  return api.get(API_ROUTES.targets.byId(id), null);
}

export function postTarget(
  input: AssignTargetInput
): Promise<ApiResponse<PerformanceTarget>> {
  return api.post(API_ROUTES.targets.root, input, emptyTarget());
}

export function patchTarget(
  id: string,
  input: Partial<AssignTargetInput>
): Promise<ApiResponse<PerformanceTarget>> {
  return api.patch(API_ROUTES.targets.byId(id), input, emptyTarget(id));
}

export function deleteTarget(id: string): Promise<ApiResponse<{ ok: boolean }>> {
  return api.delete(API_ROUTES.targets.byId(id), { ok: false });
}

export function fetchTargetDashboard(): Promise<
  ApiResponse<TargetDashboardStats>
> {
  return api.get(API_ROUTES.targets.dashboard, {
    total: 0,
    completed: 0,
    inProgress: 0,
    delayed: 0,
    critical: 0,
    completionRate: 0,
    averagePerformance: 0,
    employeesAtRisk: 0,
    upcomingDeadlines: 0,
    byCategory: [],
    byStatus: [],
    byDepartment: [],
    topPerformers: [],
    bottomPerformers: [],
    completionTrend: [],
  });
}

export function fetchDelayedCenter(): Promise<
  ApiResponse<{
    delayedTargets: PerformanceTarget[];
    criticalTargets: PerformanceTarget[];
    highRiskTargets: PerformanceTarget[];
    delayedTasks: Array<Record<string, unknown>>;
  }>
> {
  return api.get(API_ROUTES.targets.delayed, {
    delayedTargets: [],
    criticalTargets: [],
    highRiskTargets: [],
    delayedTasks: [],
  });
}
