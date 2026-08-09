import { fetchEmployeeById, fetchEmployeeProfileExtras, fetchEmployees } from "@/api/employees.api";
import type {
  CreateEmployeeInput,
  EmployeeFilters,
  UpdateEmployeeInput,
} from "@/api/contracts";
import { buildMockEmployeeProfileExtras } from "@/mocks/employee-profile";
import { isApiMode } from "@/lib/env";
import { employeeRepository } from "@/repositories";
import { fail, fromError, ok } from "@/services/api-result";
import type { ApiResponse, Department, Employee } from "@/types";
import type { EmployeeProfileExtras } from "@/types/employee-profile";
import { syncEmployeeLeaveStatuses } from "./employees-service-helpers";

export type { CreateEmployeeInput, EmployeeFilters, UpdateEmployeeInput };
export type { EmployeeProfileExtras };
export { syncEmployeeLeaveStatuses };
export {
  createEmployee,
  deleteEmployee,
  updateEmployee,
  updateEmployeeStatus,
} from "./employees-mutations";

/** GET /employees */
export async function getEmployees(
  filters: EmployeeFilters = {}
): Promise<ApiResponse<Employee[]>> {
  if (isApiMode()) return fetchEmployees(filters);
  try {
    await syncEmployeeLeaveStatuses();
    const results = await employeeRepository.search(filters);
    return ok(results);
  } catch (error) {
    return fromError(error, []);
  }
}

/** Workforce roster: active + on_leave (excludes inactive). */
export async function getWorkforceEmployees(
  filters: Omit<EmployeeFilters, "status"> = {}
): Promise<ApiResponse<Employee[]>> {
  const res = await getEmployees(filters);
  if (!res.success) return res;
  return ok(res.data.filter((e) => e.status !== "inactive"));
}

/** GET /employees/:id */
export async function getEmployeeById(
  id: string
): Promise<ApiResponse<Employee | null>> {
  if (isApiMode()) return fetchEmployeeById(id);
  try {
    const employee = await employeeRepository.findById(id);
    if (!employee) return fail(null, "Employee not found", "NOT_FOUND");
    return ok(employee);
  } catch (error) {
    return fromError(error, null);
  }
}

/** GET /employees?department= */
export async function getEmployeesByDepartment(
  department: Department
): Promise<ApiResponse<Employee[]>> {
  return getEmployees({ department });
}

/** GET /employees?query= */
export async function searchEmployees(
  query: string
): Promise<ApiResponse<Employee[]>> {
  return getEmployees({ query });
}

/**
 * GET /employees/:id/profile-extras
 * Local mode returns deterministic enrichment; API mode never fabricates.
 */
export async function loadEmployeeProfileExtras(
  employee: Employee
): Promise<ApiResponse<EmployeeProfileExtras | null>> {
  if (isApiMode()) {
    return fetchEmployeeProfileExtras(employee.id);
  }
  try {
    return ok(buildMockEmployeeProfileExtras(employee));
  } catch (error) {
    return fromError(error, null);
  }
}
