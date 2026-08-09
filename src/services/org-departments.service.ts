import { isApiMode } from "@/lib/env";
import {
  deleteDepartmentRemote,
  fetchDepartments,
  putDepartment,
} from "@/api/org.api";
import {
  departmentsRepository,
  positionsRepository,
} from "@/repositories/org.repository";
import { fromError, ok } from "@/services/api-result";
import { simulateDelay } from "@/services/fake-api";
import type { ApiResponse } from "@/types";
import type { OrgDepartment } from "@/types/org";
import { employeeRepository } from "@/repositories";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";

/** GET /org/departments */
export async function getDepartments(): Promise<ApiResponse<OrgDepartment[]>> {
  if (isApiMode()) return fetchDepartments();
  try {
    await simulateDelay();
    const rows = await departmentsRepository.list();
    return ok(rows.filter((d) => !d.deletedAt));
  } catch (error) {
    return fromError(error, []);
  }
}

/** Active department names for selects (API + local). */
export async function getActiveDepartmentNames(): Promise<string[]> {
  const res = await getDepartments();
  if (!res.success) return [];
  return res.data.filter((d) => d.active).map((d) => d.name);
}

/** PUT /org/departments */
export async function saveDepartment(
  input: Partial<OrgDepartment> & { name: string; id?: string }
): Promise<ApiResponse<OrgDepartment | null>> {
  if (isApiMode()) return putDepartment(input);
  try {
    await simulateDelay();
    const name = input.name.trim();
    if (!name) {
      throw new ValidationError("Department name is required");
    }
    const existing = await departmentsRepository.list();
    const clash = existing.find(
      (d) =>
        !d.deletedAt &&
        d.name.toLowerCase() === name.toLowerCase() &&
        d.id !== input.id
    );
    if (clash) {
      throw new ConflictError("A department with this name already exists");
    }

    let previousName: string | null = null;
    if (input.id) {
      const current = existing.find((d) => d.id === input.id);
      if (!current || current.deletedAt) {
        throw new NotFoundError("Department not found");
      }
      previousName = current.name;
    }

    const saved = await departmentsRepository.upsert({
      ...(input.id ? { id: input.id } : {}),
      name,
      nameAr: input.nameAr,
      code: input.code,
      color: input.color ?? "#082868",
      active: input.active ?? true,
    });
    if (previousName && previousName !== saved.name) {
      const employees = await employeeRepository.list();
      for (const emp of employees) {
        if (emp.department === previousName && !emp.deletedAt) {
          await employeeRepository.mutate(emp.id, (row) => ({
            ...row,
            department: saved.name,
          }));
        }
      }
      const positions = await positionsRepository.list();
      for (const pos of positions) {
        if (pos.department === previousName && !pos.deletedAt) {
          await positionsRepository.upsert({
            ...pos,
            department: saved.name,
          });
        }
      }
    }
    return ok(saved, "Department saved");
  } catch (error) {
    return fromError(error, null);
  }
}

/** DELETE /org/departments/:id */
export async function deleteDepartment(
  id: string
): Promise<ApiResponse<boolean>> {
  if (isApiMode()) return deleteDepartmentRemote(id);
  try {
    await simulateDelay();
    const current = await departmentsRepository.findById(id);
    if (!current || current.deletedAt) {
      throw new NotFoundError("Department not found");
    }
    const employees = await employeeRepository.list();
    const inUse = employees.some(
      (e) => e.department === current.name && !e.deletedAt
    );
    if (inUse) {
      throw new ValidationError(
        "Cannot delete a department that still has employees. Reassign them first."
      );
    }
    await departmentsRepository.delete(id, false);
    return ok(true, "Department removed");
  } catch (error) {
    return fromError(error, false);
  }
}
