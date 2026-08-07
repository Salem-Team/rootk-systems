import { api } from "@/api/http";
import { API_ROUTES, toQuery } from "@/api/routes";
import type {
  ApiResponse,
  EmployeeTargetPerformance,
  PerformanceTarget,
  TargetCategory,
  TargetDashboardStats,
  TargetFilters,
  TargetTemplate,
  TargetType,
  TargetWarning,
} from "@/types";
import type {
  AssignTargetInput,
  TargetCategoryInput,
  TargetTemplateInput,
  TargetTypeInput,
  TargetWarningInput,
} from "@/schemas/targets.schema";

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

export function fetchTargetWarnings(filters: {
  targetId?: string;
  employeeId?: string;
} = {}): Promise<ApiResponse<TargetWarning[]>> {
  return api.getList(
    `${API_ROUTES.targets.warnings}${toQuery(filters)}`
  );
}

export function postTargetWarning(
  input: TargetWarningInput
): Promise<ApiResponse<TargetWarning>> {
  return api.post(API_ROUTES.targets.warnings, input, {
    id: "",
    targetId: "",
    employeeId: "",
    reason: "",
    managerNotes: "",
    requiredAction: "",
    penaltyType: "written_warning",
    penaltyNote: "",
    acknowledgedAt: null,
    acknowledgedBy: null,
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

export function patchAcknowledgeWarning(
  id: string
): Promise<ApiResponse<TargetWarning>> {
  return api.patch(API_ROUTES.targets.warningAcknowledge(id), {}, {
    id,
    targetId: "",
    employeeId: "",
    reason: "",
    managerNotes: "",
    requiredAction: "",
    penaltyType: "written_warning",
    penaltyNote: "",
    acknowledgedAt: null,
    acknowledgedBy: null,
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

export function fetchEmployeeTargetPerformance(
  employeeId: string
): Promise<ApiResponse<EmployeeTargetPerformance>> {
  return api.get(API_ROUTES.targets.employeePerformance(employeeId), {
    employeeId,
    overallScore: 0,
    currentTargets: 0,
    completed: 0,
    remaining: 0,
    warnings: 0,
    delayedTasks: 0,
    monthlyTrend: [],
    targets: [],
  });
}
