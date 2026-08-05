import type {
  CreateEmployeeInput,
  EmployeeFilters,
  UpdateEmployeeInput,
} from "@/api/contracts";
import { api } from "@/api/http";
import { API_ROUTES, toQuery } from "@/api/routes";
import type { ApiResponse, Employee, EmployeeStatus } from "@/types";
import type { EmployeeProfileExtras } from "@/types/employee-profile";

const EMPTY_EMPLOYEE: Employee = {
  id: "",
  employeeId: "",
  name: "",
  email: "",
  phone: "",
  department: "Engineering",
  position: "",
  status: "inactive",
  joinDate: "",
  location: "",
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

function employeeQuery(filters: EmployeeFilters = {}) {
  return toQuery({
    query: filters.query,
    department: filters.department,
    status: filters.status,
    location: filters.location,
    page: filters.page,
    pageSize: filters.pageSize,
    cursor: filters.cursor,
  });
}

/** GET /employees */
export function fetchEmployees(
  filters: EmployeeFilters = {}
): Promise<ApiResponse<Employee[]>> {
  return api.getList(
    `${API_ROUTES.employees.root}${employeeQuery(filters)}`
  );
}

/** GET /employees/:id */
export function fetchEmployeeById(
  id: string
): Promise<ApiResponse<Employee | null>> {
  return api.get(API_ROUTES.employees.byId(id), null);
}

/** POST /employees */
export function postEmployee(
  input: CreateEmployeeInput
): Promise<ApiResponse<Employee>> {
  return api.post(API_ROUTES.employees.root, input, EMPTY_EMPLOYEE);
}

/** PATCH /employees/:id */
export function patchEmployee(
  id: string,
  input: UpdateEmployeeInput
): Promise<ApiResponse<Employee>> {
  return api.patch(API_ROUTES.employees.byId(id), input, EMPTY_EMPLOYEE);
}

/** PATCH /employees/:id/status */
export function patchEmployeeStatus(
  id: string,
  status: EmployeeStatus
): Promise<ApiResponse<Employee>> {
  return api.patch(API_ROUTES.employees.status(id), { status }, EMPTY_EMPLOYEE);
}

/** DELETE /employees/:id (soft delete on Nest) */
export function deleteEmployeeRemote(
  id: string
): Promise<ApiResponse<boolean>> {
  return api.delete(API_ROUTES.employees.byId(id), false);
}

/** GET /employees/:id/profile-extras */
export function fetchEmployeeProfileExtras(
  id: string
): Promise<ApiResponse<EmployeeProfileExtras | null>> {
  return api.get(API_ROUTES.employees.profileExtras(id), null);
}
