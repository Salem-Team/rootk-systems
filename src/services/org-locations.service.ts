import { isApiMode } from "@/lib/env";
import { parseGoogleMapsUrl } from "@/lib/geo";
import {
  deleteLocationRemote,
  fetchLocations,
  putLocation,
  resolveMapsUrlRemote,
} from "@/api/org.api";
import { locationsRepository } from "@/repositories/org.repository";
import { fail, fromError, ok } from "@/services/api-result";
import { simulateDelay } from "@/services/fake-api";
import type { ApiResponse } from "@/types";
import type { OfficeLocation } from "@/types/org";

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
