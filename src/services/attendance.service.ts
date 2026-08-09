import type { AttendanceFilters } from "@/api/contracts";
import { fetchAttendance, fetchMyTodayAttendance } from "@/api/attendance.api";
import { isApiMode } from "@/lib/env";
import { todayKey } from "@/lib/mock-date";
import { attendanceRepository } from "@/repositories";
import { fromError, ok } from "@/services/api-result";
import { getWorkEmployeeId } from "@/stores/session-store";
import type { ApiResponse, AttendanceRecord } from "@/types";

export type { AttendanceFilters };
export type { PunchLocation } from "@/services/attendance-service-helpers";
export { checkIn } from "@/services/attendance-check-in";
export { checkOut } from "@/services/attendance-check-out";

/** GET /attendance */
export async function getAttendance(
  filters: AttendanceFilters = {}
): Promise<ApiResponse<AttendanceRecord[]>> {
  if (isApiMode()) return fetchAttendance(filters);
  try {
    return ok(await attendanceRepository.filter(filters));
  } catch (error) {
    return fromError(error, []);
  }
}

/** GET /attendance?date=today */
export async function getTodayAttendance(): Promise<
  ApiResponse<AttendanceRecord[]>
> {
  return getAttendance({ date: todayKey() });
}

/** GET /attendance?employeeId=&from=&to= */
export async function getEmployeeAttendance(
  employeeId: string,
  from?: string,
  to?: string
): Promise<ApiResponse<AttendanceRecord[]>> {
  return getAttendance({ employeeId, from, to });
}

/** GET /attendance/me/today */
export async function getMyTodayRecord(
  employeeId = getWorkEmployeeId()
): Promise<ApiResponse<AttendanceRecord | null>> {
  if (isApiMode()) return fetchMyTodayAttendance();
  try {
    const record = await attendanceRepository.findByEmployeeAndDate(
      employeeId,
      todayKey()
    );
    return ok(record);
  } catch (error) {
    return fromError(error, null);
  }
}
