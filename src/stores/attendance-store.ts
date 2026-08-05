import { create } from "zustand";
import {
  checkIn as checkInService,
  checkOut as checkOutService,
  getMyTodayRecord,
  type PunchLocation,
} from "@/services/attendance.service";
import { getBrowserLocation } from "@/lib/geo";
import { getWorkEmployeeId } from "@/stores/session-store";
import type { TranslationPath } from "@/i18n";
import type { AttendanceRecord } from "@/types";

interface AttendanceState {
  todayRecord: AttendanceRecord | null;
  isLoading: boolean;
  isCheckingIn: boolean;
  isCheckingOut: boolean;
  error: TranslationPath | null;
  /** Optional toast description (e.g. distance from office). */
  errorDetail: string | null;
  fetchTodayRecord: (employeeId?: string) => Promise<void>;
  checkIn: (options?: { wfh?: boolean; note?: string }) => Promise<boolean>;
  checkOut: () => Promise<boolean>;
  clearError: () => void;
  reset: () => void;
}

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

function mapPunchError(
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

async function resolveOfficeLocation(
  requireGeo: boolean
): Promise<PunchLocation | undefined> {
  if (!requireGeo) return undefined;
  return getBrowserLocation({
    enableHighAccuracy: true,
    timeout: 25_000,
    maximumAge: 10_000,
  });
}

export const useAttendanceStore = create<AttendanceState>((set) => ({
  todayRecord: null,
  isLoading: false,
  isCheckingIn: false,
  isCheckingOut: false,
  error: null,
  errorDetail: null,

  fetchTodayRecord: async (employeeId = getWorkEmployeeId()) => {
    set({ isLoading: true, error: null, errorDetail: null });
    try {
      const res = await getMyTodayRecord(employeeId);
      if (!res.success) {
        set({
          error: "errors.loadAttendance",
          errorDetail: null,
          isLoading: false,
        });
        return;
      }
      set({ todayRecord: res.data, isLoading: false });
    } catch {
      set({
        error: "errors.loadAttendance",
        errorDetail: null,
        isLoading: false,
      });
    }
  },

  checkIn: async (options) => {
    const employeeId = getWorkEmployeeId();
    const wfh = Boolean(options?.wfh);
    set({ isCheckingIn: true, error: null, errorDetail: null });
    try {
      let location: PunchLocation | undefined;
      try {
        location = await resolveOfficeLocation(!wfh);
      } catch (geoError) {
        const message =
          geoError instanceof Error ? geoError.message : "Location unavailable";
        const mapped = mapPunchError(undefined, message);
        set({
          error: mapped.error,
          errorDetail: mapped.detail,
          isCheckingIn: false,
        });
        return false;
      }

      const res = await checkInService(employeeId, {
        wfh,
        note: options?.note,
        location,
      });
      if (!res.success) {
        const mapped = mapPunchError(
          res.error?.code,
          res.message,
          res.error?.details
        );
        set({
          error: mapped.error,
          errorDetail: mapped.detail,
          isCheckingIn: false,
        });
        return false;
      }
      set({ todayRecord: res.data, isCheckingIn: false });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : undefined;
      const mapped = mapPunchError(undefined, message);
      set({
        error: mapped.error === "errors.checkInFailed"
          ? "errors.checkInFailed"
          : mapped.error,
        errorDetail: mapped.detail ?? message ?? null,
        isCheckingIn: false,
      });
      return false;
    }
  },

  checkOut: async () => {
    const employeeId = getWorkEmployeeId();
    set({ isCheckingOut: true, error: null, errorDetail: null });
    try {
      const current = useAttendanceStore.getState().todayRecord;
      const requireGeo = current?.status !== "wfh";
      let location: PunchLocation | undefined;
      try {
        location = await resolveOfficeLocation(requireGeo);
      } catch (geoError) {
        const message =
          geoError instanceof Error ? geoError.message : "Location unavailable";
        const mapped = mapPunchError(undefined, message);
        set({
          error: mapped.error,
          errorDetail: mapped.detail,
          isCheckingOut: false,
        });
        return false;
      }

      const res = await checkOutService(employeeId, { location });
      if (!res.success) {
        const code = res.error?.code;
        const message = res.message ?? "";
        if (code === "CONFLICT" && /Already checked out/i.test(message)) {
          set({
            error: "errors.alreadyCheckedOut",
            errorDetail: null,
            isCheckingOut: false,
          });
          return false;
        }
        if (
          code === "CONFLICT" ||
          code === "NOT_FOUND" ||
          /Check-in required/i.test(message)
        ) {
          set({
            error: "errors.noCheckIn",
            errorDetail: null,
            isCheckingOut: false,
          });
          return false;
        }
        const mapped = mapPunchError(code, message, res.error?.details);
        set({
          error:
            mapped.error === "errors.checkInFailed"
              ? "errors.checkOutFailed"
              : mapped.error,
          errorDetail: mapped.detail,
          isCheckingOut: false,
        });
        return false;
      }
      set({ todayRecord: res.data, isCheckingOut: false });
      return true;
    } catch {
      set({
        error: "errors.checkOutFailed",
        errorDetail: null,
        isCheckingOut: false,
      });
      return false;
    }
  },

  clearError: () => set({ error: null, errorDetail: null }),
  reset: () =>
    set({
      todayRecord: null,
      isLoading: false,
      isCheckingIn: false,
      isCheckingOut: false,
      error: null,
      errorDetail: null,
    }),
}));

export function selectIsCheckedIn(state: AttendanceState): boolean {
  return Boolean(state.todayRecord?.checkIn);
}

export function selectIsCheckedOut(state: AttendanceState): boolean {
  return Boolean(state.todayRecord?.checkOut);
}

export function selectCanCheckIn(state: AttendanceState): boolean {
  const record = state.todayRecord;
  if (!record) return true;
  // Leave day is locked; absence without a punch can still be corrected by check-in.
  if (record.status === "on_leave") return false;
  return !record.checkIn;
}

export function selectCanCheckOut(state: AttendanceState): boolean {
  return Boolean(state.todayRecord?.checkIn && !state.todayRecord?.checkOut);
}
