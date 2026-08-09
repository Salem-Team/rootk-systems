import { api } from "@/api/http";
import { API_ROUTES, toQuery } from "@/api/routes";
import type { ApiResponse, EmployeeTargetPerformance, TargetWarning } from "@/types";
import type { TargetWarningInput } from "@/schemas/targets.schema";

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
