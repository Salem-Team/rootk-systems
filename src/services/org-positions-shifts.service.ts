import { isApiMode } from "@/lib/env";
import {
  deletePositionRemote,
  deleteShiftRemote,
  fetchPositions,
  fetchShifts,
  putPosition,
  putShift,
} from "@/api/org.api";
import {
  positionsRepository,
  shiftsRepository,
} from "@/repositories/org.repository";
import { fromError, ok } from "@/services/api-result";
import { simulateDelay } from "@/services/fake-api";
import type { ApiResponse } from "@/types";
import type { JobPosition, ShiftDefinition } from "@/types/org";

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
