import { ForbiddenError, ValidationError } from "@/lib/errors";
import {
  findMatchingOffice,
  findNearestOffice,
  isValidGeoPoint,
  type GeoPoint,
} from "@/lib/geo";
import type { WorkClockSchedule } from "@/lib/work-time";
import { locationsRepository, scheduleRepository } from "@/repositories";
import type { AttendanceRecord } from "@/types";
import type { ScheduleAdminMetadata } from "@/types/org";

export type PunchLocation = GeoPoint & { accuracy?: number };

export function emptyRecord(
  employeeId: string,
  date: string
): AttendanceRecord {
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

export async function loadWorkClock(): Promise<WorkClockSchedule> {
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

export async function assertOfficeGeofence(
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
