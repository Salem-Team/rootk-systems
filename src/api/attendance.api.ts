import type { AttendanceFilters } from "@/api/contracts";
import { api } from "@/api/http";
import { API_ROUTES, toQuery } from "@/api/routes";
import type { ApiResponse, AttendanceRecord } from "@/types";

function emptyRecord(employeeId = "", date = ""): AttendanceRecord {
  return {
    id: "",
    employeeId,
    date,
    status: "absent",
    workingMinutes: 0,
    grossMinutes: 0,
    breakAppliedMinutes: 0,
    isLate: false,
    isEarlyLeave: false,
    lateMinutes: 0,
    earlyLeaveMinutes: 0,
    overtimeMinutes: 0,
    companyId: "",
    createdAt: "",
    updatedAt: "",
    createdBy: "",
    updatedBy: "",
    deletedAt: null,
    isArchived: false,
    version: 0,
    metadata: {},
  };
}

/** GET /attendance */
export function fetchAttendance(
  filters: AttendanceFilters = {}
): Promise<ApiResponse<AttendanceRecord[]>> {
  return api.getList(
    `${API_ROUTES.attendance.root}${toQuery({
      employeeId: filters.employeeId,
      date: filters.date,
      status: filters.status,
      from: filters.from,
      to: filters.to,
      page: filters.page,
      pageSize: filters.pageSize,
      cursor: filters.cursor,
    })}`
  );
}

/** GET /attendance/me/today */
export function fetchMyTodayAttendance(): Promise<
  ApiResponse<AttendanceRecord | null>
> {
  return api.get(API_ROUTES.attendance.meToday, null);
}

/** POST /attendance/check-in */
export function postCheckIn(body: {
  employeeId?: string;
  wfh?: boolean;
  note?: string;
}): Promise<ApiResponse<AttendanceRecord>> {
  return api.post(API_ROUTES.attendance.checkIn, body, emptyRecord());
}

/** POST /attendance/check-out */
export function postCheckOut(body?: {
  employeeId?: string;
}): Promise<ApiResponse<AttendanceRecord>> {
  return api.post(API_ROUTES.attendance.checkOut, body ?? {}, emptyRecord());
}
