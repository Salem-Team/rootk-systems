import type { AttendanceState } from "./attendance-store-types";

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
