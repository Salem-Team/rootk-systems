import { isApiMode } from "@/lib/env";
import { parseGoogleMapsUrl } from "@/lib/geo";
import {
  deleteLocationRemote,
  deletePositionRemote,
  deleteShiftRemote,
  fetchApprovalRules,
  fetchLocations,
  fetchPositions,
  fetchShifts,
  patchApprovalRule,
  putLocation,
  putPosition,
  putShift,
  resolveMapsUrlRemote,
} from "@/api/org.api";
import {
  approvalsRepository,
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
  ShiftDefinition,
} from "@/types/org";

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
