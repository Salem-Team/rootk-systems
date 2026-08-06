import { isApiMode } from "@/lib/env";
import { parseGoogleMapsUrl } from "@/lib/geo";
import {
  deleteDepartmentRemote,
  deleteLocationRemote,
  deletePositionRemote,
  deleteShiftRemote,
  fetchApprovalRules,
  fetchDepartments,
  fetchLocations,
  fetchPositions,
  fetchShifts,
  patchApprovalRule,
  putDepartment,
  putLocation,
  putPosition,
  putShift,
  resolveMapsUrlRemote,
} from "@/api/org.api";
import {
  approvalsRepository,
  departmentsRepository,
  locationsRepository,
  positionsRepository,
  shiftsRepository,
} from "@/repositories/org.repository";
import { fail, fromError, ok } from "@/services/api-result";
import { simulateDelay } from "@/services/fake-api";
import type { ApiResponse } from "@/types";
import type {
  ApprovalRule,
  JobPosition,
  OfficeLocation,
  OrgDepartment,
  ShiftDefinition,
} from "@/types/org";
import { employeeRepository } from "@/repositories";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";

/** GET /org/locations */
export async function getLocations(): Promise<ApiResponse<OfficeLocation[]>> {
  if (isApiMode()) return fetchLocations();
  try {
    await simulateDelay();
    return ok(await locationsRepository.list());
  } catch (error) {
    return fromError(error, []);
  }
}

/** PUT /org/locations */
export async function saveLocation(
  input: Parameters<typeof locationsRepository.upsert>[0]
): Promise<ApiResponse<OfficeLocation | null>> {
  if (isApiMode()) return putLocation(input);
  try {
    await simulateDelay();
    return ok(await locationsRepository.upsert(input), "Location saved");
  } catch (error) {
    return fromError(error, null);
  }
}

/** DELETE /org/locations/:id */
export async function deleteLocation(
  id: string
): Promise<ApiResponse<boolean>> {
  if (isApiMode()) return deleteLocationRemote(id);
  try {
    await simulateDelay();
    return ok(await locationsRepository.delete(id), "Location removed");
  } catch (error) {
    return fromError(error, false);
  }
}

/** Resolve Google Maps link → lat/lng (local parse, or API for short links). */
export async function resolveMapsUrl(
  url: string
): Promise<ApiResponse<{ latitude: number; longitude: number } | null>> {
  const trimmed = url.trim();
  const local = parseGoogleMapsUrl(trimmed);
  if (local) return ok(local);

  if (isApiMode()) {
    return resolveMapsUrlRemote(trimmed);
  }

  // Local demo cannot follow short-link redirects (CORS). Ask for full URL.
  return fail(
    null,
    "Could not extract coordinates from Google Maps URL",
    "VALIDATION_ERROR"
  );
}

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

/** GET /org/positions */
export async function getPositions(): Promise<ApiResponse<JobPosition[]>> {
  if (isApiMode()) return fetchPositions();
  try {
    await simulateDelay();
    return ok(await positionsRepository.list());
  } catch (error) {
    return fromError(error, []);
  }
}

/** PUT /org/positions */
export async function savePosition(
  input: Parameters<typeof positionsRepository.upsert>[0]
): Promise<ApiResponse<JobPosition | null>> {
  if (isApiMode()) return putPosition(input);
  try {
    await simulateDelay();
    return ok(await positionsRepository.upsert(input), "Position saved");
  } catch (error) {
    return fromError(error, null);
  }
}

/** DELETE /org/positions/:id */
export async function deletePosition(
  id: string
): Promise<ApiResponse<boolean>> {
  if (isApiMode()) return deletePositionRemote(id);
  try {
    await simulateDelay();
    return ok(await positionsRepository.delete(id), "Position removed");
  } catch (error) {
    return fromError(error, false);
  }
}

/** GET /org/shifts */
export async function getShifts(): Promise<ApiResponse<ShiftDefinition[]>> {
  if (isApiMode()) return fetchShifts();
  try {
    await simulateDelay();
    return ok(await shiftsRepository.list());
  } catch (error) {
    return fromError(error, []);
  }
}

/** PUT /org/shifts */
export async function saveShift(
  input: Parameters<typeof shiftsRepository.upsert>[0]
): Promise<ApiResponse<ShiftDefinition | null>> {
  if (isApiMode()) return putShift(input);
  try {
    await simulateDelay();
    return ok(await shiftsRepository.upsert(input), "Shift saved");
  } catch (error) {
    return fromError(error, null);
  }
}

/** DELETE /org/shifts/:id */
export async function deleteShift(
  id: string
): Promise<ApiResponse<boolean>> {
  if (isApiMode()) return deleteShiftRemote(id);
  try {
    await simulateDelay();
    const items = await shiftsRepository.list();
    await shiftsRepository.persist(items.filter((s) => s.id !== id));
    return ok(true, "Shift deleted");
  } catch (error) {
    return fromError(error, false);
  }
}

/** GET /org/approvals */
export async function getApprovalRules(): Promise<ApiResponse<ApprovalRule[]>> {
  if (isApiMode()) return fetchApprovalRules();
  try {
    await simulateDelay();
    return ok(await approvalsRepository.list());
  } catch (error) {
    return fromError(error, []);
  }
}

/** PATCH /org/approvals/:id */
export async function updateApprovalRule(
  id: string,
  requiresApproval: boolean
): Promise<ApiResponse<ApprovalRule[]>> {
  if (isApiMode()) return patchApprovalRule(id, requiresApproval);
  try {
    await simulateDelay();
    await approvalsRepository.setRequiresApproval(id, requiresApproval);
    return ok(await approvalsRepository.list(), "Approval rule updated");
  } catch (error) {
    return fromError(error, []);
  }
}
