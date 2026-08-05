import type { AttendanceFilters } from "@/api/contracts";
import {
  fetchAttendance,
  fetchMyTodayAttendance,
  postCheckIn,
  postCheckOut,
} from "@/api/attendance.api";
import { isApiMode } from "@/lib/env";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import {
  findMatchingOffice,
  findNearestOffice,
  isValidGeoPoint,
  type GeoPoint,
} from "@/lib/geo";
import { enrichWithAudit, touchEntity } from "@/lib/entity";
import {
  mockNow,
  toCompanyIso,
  todayKey,
} from "@/lib/mock-date";
import {
  computeLateMinutes,
  settleWorkDay,
  type WorkClockSchedule,
} from "@/lib/work-time";
import { isEmployeeWfhAllowed } from "@/lib/wfh-policy";
import {
  attendanceRepository,
  employeeRepository,
  locationsRepository,
  scheduleRepository,
} from "@/repositories";
import { checkInSchema, checkOutSchema } from "@/schemas";
import { fail, fromError, ok } from "@/services/api-result";
import { getWorkEmployeeId } from "@/stores/session-store";
import type { ApiResponse, AttendanceRecord, AttendanceStatus } from "@/types";
import type { ScheduleAdminMetadata } from "@/types/org";

export type { AttendanceFilters };

export type PunchLocation = GeoPoint & { accuracy?: number };

function emptyRecord(employeeId: string, date: string): AttendanceRecord {
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

async function loadWorkClock(): Promise<WorkClockSchedule> {
  const schedule = await scheduleRepository.getSyncSafe();
  const meta = (schedule.metadata ?? {}) as ScheduleAdminMetadata;
  return {
    fromTime: schedule.fromTime,
    toTime: schedule.toTime,
    gracePeriodMinutes: schedule.gracePeriodMinutes,
    breakMinutes: schedule.breakMinutes,
    attendancePolicy: meta.attendancePolicy,
  };
}

async function assertOfficeGeofence(
  location: PunchLocation | undefined,
  action: "check-in" | "check-out"
) {
  const offices = (await locationsRepository.list())
    .filter(
      (loc) =>
        loc.active &&
        typeof loc.latitude === "number" &&
        typeof loc.longitude === "number"
    )
    .map((loc) => ({
      id: loc.id,
      name: loc.name,
      latitude: loc.latitude as number,
      longitude: loc.longitude as number,
      radiusMeters: loc.radiusMeters ?? 200,
    }));

  if (offices.length === 0) {
    throw new ValidationError("Office location not configured");
  }
  if (!isValidGeoPoint(location)) {
    throw new ValidationError(
      action === "check-in"
        ? "Location required for office check-in"
        : "Location required for office check-out"
    );
  }
  const accuracy = location.accuracy ?? 0;
  const match = findMatchingOffice(location, offices, accuracy);
  if (!match) {
    const nearest = findNearestOffice(location, offices);
    throw new ForbiddenError("Outside office geofence", {
      code: "OUTSIDE_OFFICE",
      distanceMeters: nearest
        ? Math.round(nearest.distanceMeters)
        : undefined,
      radiusMeters: nearest?.office.radiusMeters,
      officeName: nearest?.office.name,
      accuracyMeters: Math.round(accuracy),
    });
  }
  return {
    latitude: location.latitude,
    longitude: location.longitude,
    accuracy: location.accuracy,
    matchedLocationId: match.office.id,
    matchedLocationName: match.office.name,
    distanceMeters: Math.round(match.distanceMeters),
    radiusMeters: match.office.radiusMeters,
    at: new Date().toISOString(),
  };
}

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

/** POST /attendance/check-in */
export async function checkIn(
  employeeId = getWorkEmployeeId(),
  options?: { wfh?: boolean; note?: string; location?: PunchLocation }
): Promise<ApiResponse<AttendanceRecord>> {
  if (isApiMode()) {
    return postCheckIn({
      employeeId,
      wfh: options?.wfh,
      note: options?.note,
      location: options?.location,
    });
  }

  try {
    const parsed = checkInSchema.safeParse({
      employeeId,
      wfh: options?.wfh,
      note: options?.note,
      location: options?.location,
    });
    if (!parsed.success) {
      throw new ValidationError("Invalid check-in payload", parsed.error.flatten());
    }

    const actorId = getWorkEmployeeId();
    const schedule = await scheduleRepository.getSyncSafe();
    const clock = await loadWorkClock();
    const now = mockNow();
    const date = todayKey();
    const items = await attendanceRepository.list();
    const existing = items.find(
      (r) => r.employeeId === actorId && r.date === date
    );

    if (existing?.checkIn) {
      throw new ConflictError("Already checked in today");
    }
    if (existing?.status === "on_leave") {
      throw new ConflictError("Cannot check in while on approved leave");
    }

    if (parsed.data.wfh) {
      const employee = await employeeRepository.findById(actorId);
      if (
        !employee ||
        !isEmployeeWfhAllowed(schedule, employee.department, date)
      ) {
        throw new ValidationError("Work from home is not enabled for you today");
      }
    }

    const geoSnapshot = parsed.data.wfh
      ? null
      : await assertOfficeGeofence(parsed.data.location, "check-in");

    const lateMinutes = computeLateMinutes(
      now,
      date,
      clock.fromTime,
      clock.gracePeriodMinutes
    );
    const isLate = lateMinutes > 0;
    const status: AttendanceStatus = parsed.data.wfh
      ? "wfh"
      : isLate
        ? "late"
        : "present";
    const checkInIso = toCompanyIso(now, date);
    const nextMeta = { ...(existing?.metadata ?? {}) };
    if (geoSnapshot) nextMeta.checkInLocation = geoSnapshot;
    if (parsed.data.wfh) delete nextMeta.checkInLocation;

    if (existing) {
      const updated = touchEntity(existing, actorId, {
        checkIn: checkInIso,
        status,
        isLate,
        lateMinutes,
        note: parsed.data.note ?? existing.note,
        metadata: nextMeta,
      });
      await attendanceRepository.persist(
        items.map((r) => (r.id === updated.id ? updated : r))
      );
      if (isLate) {
        const { notifyLateCheckIn } = await import(
          "@/services/notification.service"
        );
        void notifyLateCheckIn({
          employeeId: actorId,
          lateMinutes,
          recordId: updated.id,
        });
      }
      return ok(updated, "Checked in successfully");
    }

    const record = enrichWithAudit(
      {
        id: `att-${date.replace(/-/g, "")}-${actorId.slice(-3)}`,
        employeeId: actorId,
        date,
        checkIn: checkInIso,
        status,
        workingMinutes: 0,
        grossMinutes: 0,
        breakAppliedMinutes: 0,
        isLate,
        isEarlyLeave: false,
        lateMinutes,
        earlyLeaveMinutes: 0,
        overtimeMinutes: 0,
        note: parsed.data.note,
        metadata: nextMeta,
      },
      actorId
    );

    items.unshift(record);
    await attendanceRepository.persist(items);
    if (isLate) {
      const { notifyLateCheckIn } = await import(
        "@/services/notification.service"
      );
      void notifyLateCheckIn({
        employeeId: actorId,
        lateMinutes,
        recordId: record.id,
      });
    }
    return ok(record, "Checked in successfully");
  } catch (error) {
    if (error instanceof ConflictError) {
      const existing = await attendanceRepository
        .findByEmployeeAndDate(employeeId, todayKey())
        .catch(() => null);
      return fail(
        existing ?? emptyRecord(employeeId, todayKey()),
        error.message,
        error.code
      );
    }
    return fromError(error, emptyRecord(employeeId, todayKey()));
  }
}

/** POST /attendance/check-out */
export async function checkOut(
  employeeId = getWorkEmployeeId(),
  options?: { location?: PunchLocation }
): Promise<ApiResponse<AttendanceRecord>> {
  if (isApiMode()) {
    return postCheckOut({ employeeId, location: options?.location });
  }

  try {
    const parsed = checkOutSchema.safeParse({
      employeeId,
      location: options?.location,
    });
    if (!parsed.success) {
      throw new ValidationError(
        "Invalid check-out payload",
        parsed.error.flatten()
      );
    }

    const actorId = getWorkEmployeeId();
    const clock = await loadWorkClock();
    const now = mockNow();
    const date = todayKey();
    const items = await attendanceRepository.list();
    const record = items.find(
      (r) => r.employeeId === actorId && r.date === date
    );

    if (!record) throw new NotFoundError("No attendance record for today");
    if (!record.checkIn) throw new ConflictError("No check-in found for today");
    if (record.checkOut) throw new ConflictError("Already checked out today");

    const geoSnapshot =
      record.status === "wfh"
        ? null
        : await assertOfficeGeofence(parsed.data.location, "check-out");

    const settled = settleWorkDay({
      dateKey: date,
      checkInIso: record.checkIn,
      checkOut: now,
      schedule: clock,
      previousStatus: record.status,
      wasLate: record.isLate,
      lateMinutes: record.lateMinutes,
    });

    const nextMeta = { ...(record.metadata ?? {}) };
    if (geoSnapshot) nextMeta.checkOutLocation = geoSnapshot;

    const updated = touchEntity(record, actorId, {
      checkOut: toCompanyIso(now, date),
      workingMinutes: settled.workingMinutes,
      grossMinutes: settled.grossMinutes,
      breakAppliedMinutes: settled.breakAppliedMinutes,
      isEarlyLeave: settled.isEarlyLeave,
      earlyLeaveMinutes: settled.earlyLeaveMinutes,
      overtimeMinutes: settled.overtimeMinutes,
      isLate: settled.isLate,
      lateMinutes: settled.lateMinutes,
      status: settled.status,
      metadata: nextMeta,
    });

    await attendanceRepository.persist(
      items.map((r) => (r.id === updated.id ? updated : r))
    );
    if (settled.isEarlyLeave) {
      const { notifyEarlyLeave } = await import(
        "@/services/notification.service"
      );
      void notifyEarlyLeave({
        employeeId: actorId,
        earlyMinutes: settled.earlyLeaveMinutes,
        recordId: updated.id,
      });
    }
    return ok(updated, "Checked out successfully");
  } catch (error) {
    return fromError(error, emptyRecord(employeeId, todayKey()));
  }
}
