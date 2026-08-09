import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { dateKeyFromDate, settleWorkDay, utcDay, type AttendanceStatus } from "../lib/work-time";
import { NotificationsService } from "../notifications/notifications.service";
import { writeActivity } from "../common/activity-writer";
import { asMetadata, mapAttendance, type PunchLocation } from "./attendance-mappers";
import { AttendanceSharedService } from "./attendance-shared.service";

/** Check-out flow: geofencing, work-day settlement, early-leave notifications. */
@Injectable()
export class AttendanceCheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly shared: AttendanceSharedService
  ) {}

  async checkOut(
    companyId: string,
    actorId: string,
    body: { employeeId?: string; location?: PunchLocation }
  ) {
    const employeeId = body.employeeId;
    if (!employeeId) throw new BadRequestException("employeeId required");
    const day = utcDay();
    const dateKey = dateKeyFromDate(day);
    const existing = await this.prisma.attendanceRecord.findFirst({
      where: { companyId, employeeId, date: day, deletedAt: null },
    });
    if (!existing?.checkIn) {
      throw new BadRequestException("Check-in required before check-out");
    }
    if (existing.checkOut) {
      throw new ConflictException("Already checked out today");
    }

    const isWfhDay = existing.status === "wfh";
    const geoSnapshot = isWfhDay
      ? null
      : await this.shared.assertOfficeGeofence(companyId, body.location, "check-out");

    const schedule = await this.shared.scheduleBundle(companyId);
    const now = new Date();
    const settled = settleWorkDay({
      dateKey,
      checkIn: existing.checkIn,
      checkOut: now,
      schedule,
      previousStatus: existing.status as AttendanceStatus,
      wasLate: existing.isLate,
      lateMinutes: existing.lateMinutes,
    });

    const nextMeta = asMetadata(existing.metadata);
    if (geoSnapshot) nextMeta.checkOutLocation = geoSnapshot;

    const row = await this.prisma.attendanceRecord.update({
      where: { id: existing.id },
      data: {
        checkOut: now,
        workingMinutes: settled.workingMinutes,
        grossMinutes: settled.grossMinutes,
        breakAppliedMinutes: settled.breakAppliedMinutes,
        earlyLeaveMinutes: settled.earlyLeaveMinutes,
        overtimeMinutes: settled.overtimeMinutes,
        isEarlyLeave: settled.isEarlyLeave,
        isLate: settled.isLate,
        lateMinutes: settled.lateMinutes,
        status: settled.status,
        metadata: nextMeta as Prisma.InputJsonValue,
        updatedBy: actorId,
        version: { increment: 1 },
      },
    });

    if (settled.isEarlyLeave) {
      const employee = await this.prisma.employee.findFirst({
        where: { id: employeeId, companyId },
      });
      await this.notifications.notifyDomain({
        companyId,
        actorId,
        category: "attendance",
        priority: "normal",
        audience: "admin",
        titleKey: "notifications.earlyLeaveTitle",
        bodyKey: "notifications.earlyLeaveBody",
        vars: {
          name: employee?.name ?? employeeId,
          minutes: settled.earlyLeaveMinutes,
        },
        href: "/attendance",
        entityType: "attendance",
        entityId: row.id,
        recipientIds: [],
      });
    }

    await writeActivity(this.prisma, {
      companyId,
      type: "check_out",
      title: "Check-out",
      description: `${settled.workingMinutes}m worked`,
      employeeId,
      actorId,
    });

    return mapAttendance(row);
  }
}
