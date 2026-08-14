import { create } from "zustand";
import {
  checkIn as checkInService,
  checkOut as checkOutService,
  getMyTodayRecord,
  type PunchLocation,
} from "@/services/attendance.service";
import { getWorkEmployeeId } from "@/stores/session-store";
import { mapPunchError, resolveOfficeLocation } from "./attendance-punch-errors";
import type { AttendanceState } from "./attendance-store-types";

export type { AttendanceState } from "./attendance-store-types";
export {
  selectCanCheckIn,
  selectCanCheckOut,
  selectIsCheckedIn,
  selectIsCheckedOut,
} from "./attendance-store-selectors";

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
        // Office days require company geofence GPS; remote/WFH skips it.
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
        error:
          mapped.error === "errors.checkInFailed"
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
