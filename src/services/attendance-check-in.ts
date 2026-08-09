import { postCheckIn } from "@/api/attendance.api";
import { isApiMode } from "@/lib/env";
import { ConflictError, ValidationError } from "@/lib/errors";
import { enrichWithAudit, touchEntity } from "@/lib/entity";
import { mockNow, toCompanyIso, todayKey } from "@/lib/mock-date";
import { computeLateMinutes } from "@/lib/work-time";
import { isEmployeeWfhAllowed } from "@/lib/wfh-policy";
import { attendanceRepository, employeeRepository, scheduleRepository } from "@/repositories";
import { checkInSchema } from "@/schemas";
import { fail, fromError, ok } from "@/services/api-result";
import { getWorkEmployeeId } from "@/stores/session-store";
import type { ApiResponse, AttendanceRecord, AttendanceStatus } from "@/types";
import {
  assertOfficeGeofence,
  emptyRecord,
  loadWorkClock,
  type PunchLocation,
} from "./attendance-service-helpers";

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
