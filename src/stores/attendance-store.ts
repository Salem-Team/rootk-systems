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
  fetchTodayRecord: (employeeId?: string) => Promise<void>;
  checkIn: (options?: { wfh?: boolean; note?: string }) => Promise<boolean>;
  checkOut: () => Promise<boolean>;
  clearError: () => void;
  reset: () => void;
}

function mapPunchError(
  code?: string,
  message?: string
): TranslationPath {
  const msg = message ?? "";
  if (/Location permission denied/i.test(msg)) {
    return "errors.locationPermissionDenied";
  }
  if (/Location unavailable/i.test(msg)) {
    return "errors.locationUnavailable";
  }
  if (/Outside office/i.test(msg) || /geofence/i.test(msg)) {
    return "errors.outsideOffice";
  }
  if (/Location required/i.test(msg)) {
    return "errors.locationRequired";
  }
  if (/Office location not configured/i.test(msg)) {
    return "errors.officeLocationNotConfigured";
  }
  if (code === "FORBIDDEN") return "errors.outsideOffice";
  if (code === "CONFLICT") return "errors.alreadyCheckedIn";
  return "errors.checkInFailed";
}

async function resolveOfficeLocation(
  requireGeo: boolean
): Promise<PunchLocation | undefined> {
  if (!requireGeo) return undefined;
  return getBrowserLocation();
}

export const useAttendanceStore = create<AttendanceState>((set) => ({
  todayRecord: null,
  isLoading: false,
  isCheckingIn: false,
  isCheckingOut: false,
  error: null,

  fetchTodayRecord: async (employeeId = getWorkEmployeeId()) => {
    set({ isLoading: true, error: null });
    try {
      const res = await getMyTodayRecord(employeeId);
      if (!res.success) {
        set({ error: "errors.loadAttendance", isLoading: false });
        return;
      }
      set({ todayRecord: res.data, isLoading: false });
    } catch {
      set({ error: "errors.loadAttendance", isLoading: false });
    }
  },

  checkIn: async (options) => {
    const employeeId = getWorkEmployeeId();
    const wfh = Boolean(options?.wfh);
    set({ isCheckingIn: true, error: null });
    try {
      let location: PunchLocation | undefined;
      try {
        location = await resolveOfficeLocation(!wfh);
      } catch (geoError) {
        const message =
          geoError instanceof Error ? geoError.message : "Location unavailable";
        set({
          error: mapPunchError(undefined, message),
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
        const code = res.error?.code;
        set({
          error: mapPunchError(code, res.message),
          isCheckingIn: false,
        });
        return false;
      }
      set({ todayRecord: res.data, isCheckingIn: false });
      return true;
    } catch {
      set({ error: "errors.checkInFailed", isCheckingIn: false });
      return false;
    }
  },

  checkOut: async () => {
    const employeeId = getWorkEmployeeId();
    set({ isCheckingOut: true, error: null });
    try {
      const current = useAttendanceStore.getState().todayRecord;
      const requireGeo = current?.status !== "wfh";
      let location: PunchLocation | undefined;
      try {
        location = await resolveOfficeLocation(requireGeo);
      } catch (geoError) {
        const message =
          geoError instanceof Error ? geoError.message : "Location unavailable";
        set({
          error: mapPunchError(undefined, message),
          isCheckingOut: false,
        });
        return false;
      }

      const res = await checkOutService(employeeId, { location });
      if (!res.success) {
        const code = res.error?.code;
        const message = res.message ?? "";
        if (code === "CONFLICT" && /Already checked out/i.test(message)) {
          set({ error: "errors.alreadyCheckedOut", isCheckingOut: false });
          return false;
        }
        if (code === "CONFLICT" || code === "NOT_FOUND") {
          set({ error: "errors.noCheckIn", isCheckingOut: false });
          return false;
        }
        set({
          error:
            mapPunchError(code, message) === "errors.checkInFailed"
              ? "errors.checkOutFailed"
              : mapPunchError(code, message),
          isCheckingOut: false,
        });
        return false;
      }
      set({ todayRecord: res.data, isCheckingOut: false });
      return true;
    } catch {
      set({ error: "errors.checkOutFailed", isCheckingOut: false });
      return false;
    }
  },

  clearError: () => set({ error: null }),
  reset: () =>
    set({
      todayRecord: null,
      isLoading: false,
      isCheckingIn: false,
      isCheckingOut: false,
      error: null,
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
