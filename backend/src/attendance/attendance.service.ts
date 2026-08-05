import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { auditFields, dateOnly, isoOrNull, parseDate } from "../common/mappers";
import {
  computeLateMinutes,
  dateKeyFromDate,
  settleWorkDay,
  utcDay,
  type AttendanceStatus,
  type WorkClockSchedule,
} from "../lib/work-time";
import { isEmployeeWfhAllowed } from "../lib/wfh-policy";
import { NotificationsService } from "../notifications/notifications.service";
import { writeActivity } from "../common/activity-writer";

type ScheduleBundle = WorkClockSchedule & {
  wfhDays: string[];
  metadata: unknown;
};

const DEFAULT_SCHEDULE: ScheduleBundle = {
  fromTime: "09:00",
  toTime: "18:00",
  gracePeriodMinutes: 15,
  breakMinutes: 60,
  halfDayHours: 4,
  wfhDays: [],
  metadata: {},
};

function mapAttendance(row: {
  id: string;
  companyId: string;
  employeeId: string;
  date: Date;
  checkIn: Date | null;
  checkOut: Date | null;
  status: string;
  workingMinutes: number;
  grossMinutes: number;
  breakAppliedMinutes: number;
  earlyLeaveMinutes: number;
  overtimeMinutes: number;
  isLate: boolean;
  isEarlyLeave: boolean;
  lateMinutes: number;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  deletedAt: Date | null;
  isArchived: boolean;
  version: number;
  metadata: unknown;
}) {
  return {
    id: row.id,
    employeeId: row.employeeId,
    date: dateOnly(row.date),
    checkIn: isoOrNull(row.checkIn) ?? undefined,
    checkOut: isoOrNull(row.checkOut) ?? undefined,
    status: row.status,
    workingMinutes: row.workingMinutes,
    grossMinutes: row.grossMinutes,
    breakAppliedMinutes: row.breakAppliedMinutes,
    earlyLeaveMinutes: row.earlyLeaveMinutes,
    overtimeMinutes: row.overtimeMinutes,
    isLate: row.isLate,
    isEarlyLeave: row.isEarlyLeave,
    lateMinutes: row.lateMinutes,
    note: row.note ?? undefined,
    ...auditFields(row),
  };
}

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService
  ) {}

  private async scheduleBundle(companyId: string): Promise<ScheduleBundle> {
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

  async list(
    companyId: string,
    filters: {
      employeeId?: string;
      date?: string;
      status?: string;
      from?: string;
      to?: string;
    } = {}
  ) {
    const where: Prisma.AttendanceRecordWhereInput = {
      companyId,
      deletedAt: null,
    };
    if (filters.employeeId) where.employeeId = filters.employeeId;
    if (filters.status) where.status = filters.status;
    if (filters.date) where.date = parseDate(filters.date);
    if (filters.from || filters.to) {
      where.date = {
        ...(filters.from ? { gte: parseDate(filters.from) } : {}),
        ...(filters.to ? { lte: parseDate(filters.to) } : {}),
      };
    }
    const rows = await this.prisma.attendanceRecord.findMany({
      where,
      orderBy: { date: "desc" },
    });
    return rows.map(mapAttendance);
  }

  async meToday(companyId: string, employeeId?: string) {
    if (!employeeId) return null;
    const day = utcDay();
    const row = await this.prisma.attendanceRecord.findFirst({
      where: { companyId, employeeId, date: day, deletedAt: null },
    });
    return row ? mapAttendance(row) : null;
  }

  async checkIn(
    companyId: string,
    actorId: string,
    body: { employeeId?: string; wfh?: boolean; note?: string }
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
    if (!employee) throw new BadRequestException("Employee not found");

    const schedule = await this.scheduleBundle(companyId);
    if (body.wfh) {
      const allowed = isEmployeeWfhAllowed({
        metadata: schedule.metadata,
        wfhDays: schedule.wfhDays,
        department: employee.department,
        dateKey,
      });
      if (!allowed) {
        throw new ForbiddenException("WFH is not allowed for this employee today");
      }
    }

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

  async checkOut(
    companyId: string,
    actorId: string,
    body: { employeeId?: string }
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

    const schedule = await this.scheduleBundle(companyId);
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
