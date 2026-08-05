import { api } from "@/api/http";
import { API_ROUTES } from "@/api/routes";
import type { ApiResponse } from "@/types";
import type {
  ApprovalRule,
  JobPosition,
  OfficeLocation,
  ShiftDefinition,
} from "@/types/org";

/** GET /org/locations */
export function fetchLocations(): Promise<ApiResponse<OfficeLocation[]>> {
  return api.getList(API_ROUTES.org.locations);
}

/** PUT /org/locations (upsert) */
export function putLocation(
  input: Partial<OfficeLocation> & { id?: string }
): Promise<ApiResponse<OfficeLocation | null>> {
  return api.put(API_ROUTES.org.locations, input, null);
}

/** DELETE /org/locations/:id */
export function deleteLocationRemote(
  id: string
): Promise<ApiResponse<boolean>> {
  return api.delete(API_ROUTES.org.locationById(id), false);
}

/** POST /org/locations/resolve-maps-url */
export function resolveMapsUrlRemote(url: string): Promise<
  ApiResponse<{ latitude: number; longitude: number } | null>
> {
  return api.post(API_ROUTES.org.resolveMapsUrl, { url }, null);
}

/** GET /org/positions */
export function fetchPositions(): Promise<ApiResponse<JobPosition[]>> {
  return api.getList(API_ROUTES.org.positions);
}

/** PUT /org/positions */
export function putPosition(
  input: Partial<JobPosition> & { id?: string }
): Promise<ApiResponse<JobPosition | null>> {
  return api.put(API_ROUTES.org.positions, input, null);
}

/** DELETE /org/positions/:id */
export function deletePositionRemote(
  id: string
): Promise<ApiResponse<boolean>> {
  return api.delete(API_ROUTES.org.positionById(id), false);
}

/** GET /org/shifts */
export function fetchShifts(): Promise<ApiResponse<ShiftDefinition[]>> {
  return api.getList(API_ROUTES.org.shifts);
}

/** PUT /org/shifts */
export function putShift(
  input: Partial<ShiftDefinition> & { id?: string }
): Promise<ApiResponse<ShiftDefinition | null>> {
  return api.put(API_ROUTES.org.shifts, input, null);
}

/** DELETE /org/shifts/:id */
export function deleteShiftRemote(
  id: string
): Promise<ApiResponse<boolean>> {
  return api.delete(API_ROUTES.org.shiftById(id), false);
}

/** GET /org/approvals */
export function fetchApprovalRules(): Promise<ApiResponse<ApprovalRule[]>> {
  return api.getList(API_ROUTES.org.approvals);
}

/** PATCH /org/approvals/:id */
export function patchApprovalRule(
  id: string,
  requiresApproval: boolean
): Promise<ApiResponse<ApprovalRule[]>> {
  return api.patch(
    API_ROUTES.org.approvalById(id),
    { requiresApproval },
    []
  );
}
