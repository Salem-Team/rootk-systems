import { getBrowserLocation } from "@/lib/geo";
import type { PunchLocation } from "@/services/attendance.service";
import type { TranslationPath } from "@/i18n";

type GeoFailDetails = {
  distanceMeters?: number;
  radiusMeters?: number;
  officeName?: string;
  accuracyMeters?: number;
};

function readGeoDetails(details: unknown): GeoFailDetails | null {
  if (!details || typeof details !== "object") return null;
  const d = details as Record<string, unknown>;
  // Nest may nest as { details: {...} } or pass the bag directly.
  const bag =
    d.details && typeof d.details === "object"
      ? (d.details as Record<string, unknown>)
      : d;
  return {
    distanceMeters:
      typeof bag.distanceMeters === "number" ? bag.distanceMeters : undefined,
    radiusMeters:
      typeof bag.radiusMeters === "number" ? bag.radiusMeters : undefined,
    officeName:
      typeof bag.officeName === "string" ? bag.officeName : undefined,
    accuracyMeters:
      typeof bag.accuracyMeters === "number" ? bag.accuracyMeters : undefined,
  };
}

export function mapPunchError(
  code?: string,
  message?: string,
  details?: unknown
): { error: TranslationPath; detail: string | null } {
  const msg = message ?? "";
  const geo = readGeoDetails(details);
  const detailCode =
    details &&
    typeof details === "object" &&
    typeof (details as { code?: unknown }).code === "string"
      ? String((details as { code: string }).code)
      : undefined;
  const effectiveCode = detailCode ?? code;

  if (
    /Employee account is inactive/i.test(msg) ||
    /Employee not found/i.test(msg) ||
    effectiveCode === "EMPLOYEE_INACTIVE"
  ) {
    return { error: "errors.employeeInactive", detail: null };
  }
  if (/Location permission denied/i.test(msg)) {
    return { error: "errors.locationPermissionDenied", detail: null };
  }
  if (/Location unavailable/i.test(msg)) {
    return { error: "errors.locationUnavailable", detail: null };
  }
  if (
    /Outside office/i.test(msg) ||
    /geofence/i.test(msg) ||
    effectiveCode === "OUTSIDE_OFFICE" ||
    effectiveCode === "FORBIDDEN"
  ) {
    const parts: string[] = [];
    if (geo?.officeName) parts.push(geo.officeName);
    if (typeof geo?.distanceMeters === "number") {
      parts.push(`~${geo.distanceMeters}m`);
    }
    if (typeof geo?.radiusMeters === "number") {
      parts.push(`≤${geo.radiusMeters}m`);
    }
    return {
      error: "errors.outsideOffice",
      detail: parts.length ? parts.join(" · ") : null,
    };
  }
  if (/Location required/i.test(msg) || effectiveCode === "LOCATION_REQUIRED") {
    return { error: "errors.locationRequired", detail: null };
  }
  if (
    /Office location not configured/i.test(msg) ||
    effectiveCode === "OFFICE_NOT_CONFIGURED"
  ) {
    return { error: "errors.officeLocationNotConfigured", detail: null };
  }
  if (effectiveCode === "CONFLICT" || code === "CONFLICT") {
    return { error: "errors.alreadyCheckedIn", detail: null };
  }
  return { error: "errors.checkInFailed", detail: msg || null };
}

export async function resolveOfficeLocation(
  requireGeo: boolean
): Promise<PunchLocation | undefined> {
  if (!requireGeo) return undefined;
  return getBrowserLocation({
    enableHighAccuracy: true,
    timeout: 25_000,
    maximumAge: 10_000,
  });
}
