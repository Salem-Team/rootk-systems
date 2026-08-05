import { create } from "zustand";
import {
  checkIn as checkInService,
  checkOut as checkOutService,
  getMyTodayRecord,
} from "@/services/attendance.service";
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
    set({ isCheckingIn: true, error: null });
    try {
      const res = await checkInService(employeeId, options);
      if (!res.success) {
        const code = res.error?.code;
        set({
          error:
            code === "CONFLICT"
              ? "errors.alreadyCheckedIn"
              : "errors.checkInFailed",
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
      const res = await checkOutService(employeeId);
      if (!res.success) {
        const code = res.error?.code;
        const message = res.message ?? "";
        set({
          error:
            code === "CONFLICT" && /Already checked out/i.test(message)
              ? "errors.alreadyCheckedOut"
              : code === "CONFLICT" || code === "NOT_FOUND"
                ? "errors.noCheckIn"
                : "errors.checkOutFailed",
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
