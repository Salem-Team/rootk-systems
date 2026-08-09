import { BadRequestException, ConflictException, ForbiddenException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  computeLateMinutes,
  dateKeyFromDate,
  utcDay,
  type AttendanceStatus,
} from "../lib/work-time";
import { isEmployeeWfhAllowed } from "../lib/wfh-policy";
import { NotificationsService } from "../notifications/notifications.service";
import { writeActivity } from "../common/activity-writer";
import { asMetadata, mapAttendance, type PunchLocation } from "./attendance-mappers";
import { AttendanceSharedService } from "./attendance-shared.service";

/** Check-in flow: WFH eligibility, office geofencing, lateness computation. */
@Injectable()
export class AttendanceCheckinService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly shared: AttendanceSharedService
  ) {}

  async checkIn(
    companyId: string,
    actorId: string,
    body: {
      employeeId?: string;
      wfh?: boolean;
      note?: string;
      location?: PunchLocation;
    }
  ) {
    const employeeId = body.employeeId;
    if (!employeeId) throw new BadRequestException("employeeId required");
    const day = utcDay();
    const dateKey = dateKeyFromDate(day);
    const existing = await this.prisma.attendanceRecord.findFirst({
      where: { companyId, employeeId, date: day, deletedAt: null },
    });
    if (existing?.checkIn) {
      throw new ConflictException("Already checked in today");
    }
    if (existing?.status === "on_leave") {
      throw new ConflictException("Employee is on leave today");
    }

    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, companyId, deletedAt: null },
    });
    if (!employee) {
      throw new BadRequestException({
        message: "Employee account is inactive or missing",
        code: "EMPLOYEE_INACTIVE",
      });
    }

    const schedule = await this.shared.scheduleBundle(companyId);
    if (body.wfh) {
      const allowed = isEmployeeWfhAllowed({
        metadata: schedule.metadata,
        wfhDays: schedule.wfhDays,
        department: employee.department,
        dateKey,
      });
      if (!allowed) {
        throw new ForbiddenException(
          "WFH is not allowed for this employee today"
        );
      }
    }

    const geoSnapshot = body.wfh
      ? null
      : await this.shared.assertOfficeGeofence(companyId, body.location, "check-in");

    const now = new Date();
    const lateMinutes = computeLateMinutes(
      now,
      dateKey,
      schedule.fromTime,
      schedule.gracePeriodMinutes
    );
    const isLate = lateMinutes > 0;
    const status: AttendanceStatus = body.wfh
      ? "wfh"
      : isLate
        ? "late"
        : "present";

    const nextMeta = asMetadata(existing?.metadata);
    if (geoSnapshot) nextMeta.checkInLocation = geoSnapshot;
    if (body.wfh) delete nextMeta.checkInLocation;

    const data = {
      checkIn: now,
      status,
      isLate,
      lateMinutes,
      isEarlyLeave: false,
      earlyLeaveMinutes: 0,
      overtimeMinutes: 0,
      grossMinutes: 0,
      breakAppliedMinutes: 0,
      workingMinutes: 0,
      note: body.note ?? existing?.note ?? null,
      metadata: nextMeta as Prisma.InputJsonValue,
      updatedBy: actorId,
      version: existing ? { increment: 1 } : undefined,
      deletedAt: null,
      isArchived: false,
    };

    const row = existing
      ? await this.prisma.attendanceRecord.update({
          where: { id: existing.id },
          data: data as never,
        })
      : await this.prisma.attendanceRecord.create({
          data: {
            companyId,
            employeeId,
            date: day,
            checkIn: now,
            status,
            isLate,
            lateMinutes,
            note: body.note,
            metadata: nextMeta as Prisma.InputJsonValue,
            createdBy: actorId,
            updatedBy: actorId,
          },
        });

    if (isLate && !body.wfh) {
      await this.notifications.notifyDomain({
        companyId,
        actorId,
        category: "attendance",
        priority: "normal",
        audience: "admin",
        titleKey: "notifications.lateTitle",
        bodyKey: "notifications.lateBody",
        vars: { name: employee.name, minutes: lateMinutes },
        href: "/attendance",
        entityType: "attendance",
        entityId: row.id,
        recipientIds: [],
      });
      await writeActivity(this.prisma, {
        companyId,
        type: "late",
        title: "Late check-in",
        description: `${employee.name} · ${lateMinutes}m`,
        employeeId,
        actorId,
      });
    } else {
      await writeActivity(this.prisma, {
        companyId,
        type: "check_in",
        title: body.wfh ? "WFH check-in" : "Check-in",
        description: employee.name,
        employeeId,
        actorId,
      });
    }

    return mapAttendance(row);
  }
}
