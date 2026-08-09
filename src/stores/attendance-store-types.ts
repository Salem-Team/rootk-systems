import type { TranslationPath } from "@/i18n";
import type { AttendanceRecord } from "@/types";

export interface AttendanceState {
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
