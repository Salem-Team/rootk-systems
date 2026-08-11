import {
  deleteEmployeeRemote,
  patchEmployee,
  patchEmployeeStatus,
  postEmployee,
} from "@/api/employees.api";
import type { CreateEmployeeInput, UpdateEmployeeInput } from "@/api/contracts";
import { isApiMode } from "@/lib/env";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { createAuditFields, touchEntity } from "@/lib/entity";
import { createId } from "@/lib/id";
import { employeeRepository } from "@/repositories";
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  updateEmployeeStatusSchema,
} from "@/schemas";
import { fromError, ok } from "@/services/api-result";
import {
  getSessionUserId,
  getWorkEmployeeId,
  useSessionStore,
} from "@/stores/session-store";
import type { ApiResponse, Employee, EmployeeStatus } from "@/types";
import { emptyEmployee } from "./employees-service-helpers";

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
      managerEmployeeId: data.managerEmployeeId,
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
    const nextManagerId = (rest.managerEmployeeId ?? "").trim();
    if (nextManagerId && nextManagerId === id) {
      throw new ValidationError("An employee cannot be their own manager");
    }
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
    const account = await userRepository.findByEmail(employee.email, {
      includeInactive: true,
    });
    if (
      isProtectedAdminAccount({
        employeeId: employee.id,
        userId: account?.id,
        email: employee.email,
      })
    ) {
      throw new ForbiddenError("The system admin account cannot be deleted");
    }
    const sessionEmployeeId = getWorkEmployeeId();
    if (
      employee.id === sessionEmployeeId ||
      employee.email.trim().toLowerCase() ===
        (useSessionStore.getState().user.email ?? "").trim().toLowerCase()
    ) {
      throw new ForbiddenError("You cannot delete your own account");
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
