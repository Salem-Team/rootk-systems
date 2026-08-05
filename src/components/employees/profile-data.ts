import type { Employee } from "@/types";
import { buildMockEmployeeProfileExtras } from "@/mocks/employee-profile";
import type {
  EmployeeActivityItem,
  EmployeeAttendanceSummary,
  EmployeeLeaveSummary,
  EmployeeProfileExtras,
  EmploymentType,
  WorkMode,
} from "@/types/employee-profile";

export type {
  EmployeeActivityItem,
  EmployeeAttendanceSummary,
  EmployeeLeaveSummary,
  EmployeeProfileExtras,
  EmploymentType,
  WorkMode,
};

export { buildMockEmployeeProfileExtras };

/**
 * Sync local fallback. Prefer `useEmployeeProfileExtras` /
 * `loadEmployeeProfileExtras` for API mode.
 */
export function getEmployeeProfileExtras(
  employee: Employee
): EmployeeProfileExtras {
  return buildMockEmployeeProfileExtras(employee);
}

export function findManager(
  employee: Employee,
  roster: Employee[]
): Employee | null {
  if (!employee.manager) return null;
  return roster.find((e) => e.name === employee.manager) ?? null;
}

export function findDirectReports(
  employee: Employee,
  roster: Employee[]
): Employee[] {
  return roster.filter((e) => e.manager === employee.name);
}

export function findDepartmentPeers(
  employee: Employee,
  roster: Employee[]
): Employee[] {
  return roster.filter(
    (e) => e.department === employee.department && e.id !== employee.id
  );
}
