import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  DEFAULT_OFFICE_RADIUS_METERS,
  findMatchingOffice,
  findNearestOffice,
  isValidGeoPoint,
  type GeofencedOffice,
} from "../lib/geo";
import { DEFAULT_SCHEDULE, type PunchLocation, type ScheduleBundle } from "./attendance-mappers";

/** Shared attendance helpers: working-hours schedule and office geofencing. */
@Injectable()
export class AttendanceSharedService {
  constructor(private readonly prisma: PrismaService) {}

  async scheduleBundle(companyId: string): Promise<ScheduleBundle> {
    const schedule = await this.prisma.workSchedule.findUnique({
      where: { companyId },
    });
    const cfg =
      (schedule?.config as Partial<ScheduleBundle> | null) ?? undefined;
    const meta =
      schedule?.metadata && typeof schedule.metadata === "object"
        ? (schedule.metadata as Record<string, unknown>)
        : {};
    const attendancePolicy =
      meta.attendancePolicy && typeof meta.attendancePolicy === "object"
        ? (meta.attendancePolicy as { halfDayHours?: number })
        : {};
    return {
      fromTime: cfg?.fromTime ?? DEFAULT_SCHEDULE.fromTime,
      toTime: cfg?.toTime ?? DEFAULT_SCHEDULE.toTime,
      gracePeriodMinutes:
        cfg?.gracePeriodMinutes ?? DEFAULT_SCHEDULE.gracePeriodMinutes,
      breakMinutes: cfg?.breakMinutes ?? DEFAULT_SCHEDULE.breakMinutes,
      halfDayHours:
        attendancePolicy.halfDayHours ?? DEFAULT_SCHEDULE.halfDayHours,
      wfhDays: Array.isArray(cfg?.wfhDays) ? (cfg!.wfhDays as string[]) : [],
      metadata: schedule?.metadata ?? {},
    };
  }

  private async loadGeofencedOffices(
    companyId: string
  ): Promise<GeofencedOffice[]> {
    const rows = await this.prisma.officeLocation.findMany({
      where: {
        companyId,
        active: true,
        deletedAt: null,
        latitude: { not: null },
        longitude: { not: null },
      },
    });
    return rows
      .filter(
        (row): row is typeof row & { latitude: number; longitude: number } =>
          row.latitude != null && row.longitude != null
      )
      .map((row) => ({
        id: row.id,
        name: row.name,
        latitude: row.latitude,
        longitude: row.longitude,
        radiusMeters: row.radiusMeters || DEFAULT_OFFICE_RADIUS_METERS,
      }));
  }

  /**
   * Office-day punches must happen inside an active company office geofence.
   * WFH / remote punches skip this check. GPS accuracy is padded into the radius.
   */
  async assertOfficeGeofence(
    companyId: string,
    location: PunchLocation | undefined,
    action: "check-in" | "check-out"
  ) {
    const offices = await this.loadGeofencedOffices(companyId);
    if (offices.length === 0) {
      throw new BadRequestException({
        message: "Office location not configured",
        code: "OFFICE_NOT_CONFIGURED",
      });
    }
    if (!isValidGeoPoint(location)) {
      throw new BadRequestException({
        message:
          action === "check-in"
            ? "Location required for office check-in"
            : "Location required for office check-out",
        code: "LOCATION_REQUIRED",
      });
    }
    const accuracy = location.accuracy ?? 0;
    const match = findMatchingOffice(location, offices, accuracy);
    if (!match) {
      const nearest = findNearestOffice(location, offices);
      throw new ForbiddenException({
        message: "Outside office geofence",
        code: "OUTSIDE_OFFICE",
        details: {
          distanceMeters: nearest
            ? Math.round(nearest.distanceMeters)
            : undefined,
          radiusMeters: nearest?.office.radiusMeters,
          officeName: nearest?.office.name,
          accuracyMeters:
            typeof accuracy === "number" ? Math.round(accuracy) : undefined,
        },
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
}
