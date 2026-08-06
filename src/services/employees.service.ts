import {
  deleteEmployeeRemote,
  fetchEmployeeById,
  fetchEmployeeProfileExtras,
  fetchEmployees,
  patchEmployee,
  patchEmployeeStatus,
  postEmployee,
} from "@/api/employees.api";
import type {
  CreateEmployeeInput,
  EmployeeFilters,
  UpdateEmployeeInput,
} from "@/api/contracts";
import { buildMockEmployeeProfileExtras } from "@/mocks/employee-profile";
import { isApiMode } from "@/lib/env";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { createAuditFields, touchEntity } from "@/lib/entity";
import { createId } from "@/lib/id";
import { todayKey } from "@/lib/mock-date";
import { employeeRepository, leaveRepository } from "@/repositories";
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  updateEmployeeStatusSchema,
} from "@/schemas";
import { fail, fromError, ok } from "@/services/api-result";
import { getSessionUserId } from "@/stores/session-store";
import type { ApiResponse, Department, Employee, EmployeeStatus } from "@/types";
import type { EmployeeProfileExtras } from "@/types/employee-profile";

export type { CreateEmployeeInput, EmployeeFilters, UpdateEmployeeInput };
export type { EmployeeProfileExtras };

function emptyEmployee(): Employee {
  return {
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
}

/**
 * Keep employee.status aligned with approved leave covering today.
 * Restores `active` after leave ends; sets `on_leave` while it covers today.
 */
export async function syncEmployeeLeaveStatuses(): Promise<void> {
  if (isApiMode()) return;
  try {
    const today = todayKey();
    const [employees, leaves] = await Promise.all([
      employeeRepository.list(),
      leaveRepository.list(),
    ]);
    for (const emp of employees) {
      if (emp.deletedAt || emp.status === "inactive") continue;
      const onLeaveToday = leaves.some(
        (l) =>
          l.employeeId === emp.id &&
          l.status === "approved" &&
          l.startDate <= today &&
          l.endDate >= today
      );
      const desired: EmployeeStatus = onLeaveToday ? "on_leave" : "active";
      if (emp.status === desired) continue;
      if (emp.status !== "active" && emp.status !== "on_leave") continue;
      await employeeRepository.mutate(emp.id, (current) =>
        touchEntity(current, "system", { status: desired })
      );
    }
  } catch {
    /* best-effort */
  }
}

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

/** POST /employees */
export async function createEmployee(
  input: CreateEmployeeInput
): Promise<ApiResponse<Employee>> {
  if (isApiMode()) return postEmployee(input);
  try {
    const parsed = createEmployeeSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(
        "Invalid employee payload",
        parsed.error.flatten()
      );
    }
    const actor = getSessionUserId();
    const data = parsed.data;
    const existing = await employeeRepository.list();
    const emailTaken = existing.some(
      (e) => e.email.toLowerCase() === data.email.trim().toLowerCase()
    );
    if (emailTaken) {
      throw new ConflictError("An employee with this email already exists");
    }
    if (data.employeeId) {
      const codeTaken = existing.some(
        (e) => e.employeeId.toLowerCase() === data.employeeId!.trim().toLowerCase()
      );
      if (codeTaken) {
        throw new ConflictError("Employee ID is already in use");
      }
    }
    const employee: Employee = {
      id: createId("emp"),
      employeeId: data.employeeId ?? `RK-${Date.now().toString().slice(-6)}`,
      name: data.name,
      email: data.email,
      phone: data.phone ?? "",
      department: data.department,
      position: data.position,
      status: data.status ?? "active",
      joinDate: data.joinDate,
      location: data.location ?? "",
      manager: data.manager,
      ...createAuditFields(actor),
    };
    const created = await employeeRepository.create(employee);
    const { provisionLocalEmployeeAccount } = await import(
      "@/services/auth.service"
    );
    await provisionLocalEmployeeAccount({
      employeeId: created.id,
      email: created.email,
      name: created.name,
      password: data.password,
      actorId: actor,
    });
    try {
      const { ensureSalaryProfileForEmployee } = await import(
        "@/services/payroll.service"
      );
      await ensureSalaryProfileForEmployee({
        employeeId: created.id,
        joiningDate: created.joinDate,
      });
    } catch {
      /* salary profile is best-effort in local demo */
    }
    const { notifyEmployeeCreated } = await import(
      "@/services/notification.service"
    );
    void notifyEmployeeCreated({
      employeeId: created.id,
      name: created.name,
      actorId: actor,
    });
    return ok(created, "Employee created");
  } catch (error) {
    return fromError(error, emptyEmployee());
  }
}

/** PATCH /employees/:id */
export async function updateEmployee(
  id: string,
  input: UpdateEmployeeInput
): Promise<ApiResponse<Employee>> {
  if (isApiMode()) return patchEmployee(id, input);
  try {
    const parsed = updateEmployeeSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(
        "Invalid employee update",
        parsed.error.flatten()
      );
    }
    const actor = getSessionUserId();
    const { password, ...rest } = parsed.data;
    const previous = await employeeRepository.findById(id);
    if (!previous) throw new NotFoundError("Employee not found");
    const updated = await employeeRepository.mutate(id, (current) =>
      touchEntity(current, actor, {
        ...rest,
        phone: rest.phone ?? current.phone,
        location: rest.location ?? current.location,
      })
    );
    if (!updated) throw new NotFoundError("Employee not found");

    const nextEmail = updated.email.trim().toLowerCase();
    const prevEmail = previous.email.trim().toLowerCase();
    if (password) {
      const { resetLocalEmployeePassword } = await import(
        "@/services/auth.service"
      );
      const { removeLocalCredential } = await import(
        "@/lib/local-credentials"
      );
      if (prevEmail !== nextEmail) removeLocalCredential(prevEmail);
      await resetLocalEmployeePassword(nextEmail, password);
    } else if (prevEmail !== nextEmail) {
      const {
        getLocalCredential,
        setLocalCredential,
        removeLocalCredential,
      } = await import("@/lib/local-credentials");
      const existing = getLocalCredential(prevEmail);
      if (existing) {
        setLocalCredential(nextEmail, existing);
        removeLocalCredential(prevEmail);
      }
    }

    return ok(updated, "Employee updated");
  } catch (error) {
    return fromError(error, emptyEmployee());
  }
}

/** PATCH /employees/:id/status */
export async function updateEmployeeStatus(
  id: string,
  status: EmployeeStatus
): Promise<ApiResponse<Employee>> {
  if (isApiMode()) return patchEmployeeStatus(id, status);
  try {
    const parsed = updateEmployeeStatusSchema.safeParse({ status });
    if (!parsed.success) {
      throw new ValidationError("Invalid employee status", parsed.error.flatten());
    }

    const updated = await employeeRepository.mutate(id, (current) =>
      touchEntity(current, getSessionUserId(), { status: parsed.data.status })
    );

    if (!updated) throw new NotFoundError("Employee not found");
    const { notifyEmployeeStatusChanged } = await import(
      "@/services/notification.service"
    );
    void notifyEmployeeStatusChanged({
      employeeId: updated.id,
      name: updated.name,
      status: updated.status,
      actorId: getSessionUserId(),
    });
    return ok(updated, "Employee status updated");
  } catch (error) {
    return fromError(error, emptyEmployee());
  }
}

/** DELETE /employees/:id — hard delete from DB / local store. */
export async function deleteEmployee(
  id: string
): Promise<ApiResponse<boolean>> {
  if (isApiMode()) return deleteEmployeeRemote(id);
  try {
    const employee = await employeeRepository.findById(id);
    if (!employee) throw new NotFoundError("Employee not found");

    const { userRepository } = await import("@/repositories");
    const { removeLocalCredential } = await import(
      "@/lib/local-credentials"
    );
    const { isProtectedAdminAccount } = await import(
      "@/lib/protected-accounts"
    );
    const { ForbiddenError } = await import("@/lib/errors");
    const account = await userRepository.findByEmail(employee.email, {
      includeInactive: true,
    });
    if (
      isProtectedAdminAccount({
        employeeId: employee.id,
        email: employee.email,
        userRole: account?.role,
      })
    ) {
      throw new ForbiddenError("The system admin account cannot be deleted");
    }
    if (account) {
      await userRepository.delete(account.id, false);
    }
    removeLocalCredential(employee.email);

    const removed = await employeeRepository.delete(id, false);
    if (!removed) throw new NotFoundError("Employee not found");
    return ok(true, "Employee deleted");
  } catch (error) {
    return fromError(error, false);
  }
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
