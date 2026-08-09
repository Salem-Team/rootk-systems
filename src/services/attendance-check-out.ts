import { postCheckOut } from "@/api/attendance.api";
import { isApiMode } from "@/lib/env";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { touchEntity } from "@/lib/entity";
import { mockNow, toCompanyIso, todayKey } from "@/lib/mock-date";
import { settleWorkDay } from "@/lib/work-time";
import { attendanceRepository } from "@/repositories";
import { checkOutSchema } from "@/schemas";
import { fromError, ok } from "@/services/api-result";
import { getWorkEmployeeId } from "@/stores/session-store";
import type { ApiResponse, AttendanceRecord } from "@/types";
import {
  assertOfficeGeofence,
  emptyRecord,
  loadWorkClock,
  type PunchLocation,
} from "./attendance-service-helpers";

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
