import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { auditFields, dateOnly, parseDate } from "../common/mappers";

const DEFAULT_CONFIG = {
  workingDays: ["sunday", "monday", "tuesday", "wednesday", "thursday"],
  weekendDays: ["friday", "saturday"],
  wfhDays: ["sunday", "wednesday"] as string[],
  fromTime: "09:00",
  toTime: "18:00",
  gracePeriodMinutes: 15,
  breakMinutes: 60,
};

const DEFAULT_METADATA = {
  wfhPolicy: {
    enabled: true,
    allowedDepartments: ["Engineering", "Design", "Product", "Operations"],
    requiresApproval: false,
    monthlyQuota: 8,
    hybridOfficeDays: 3,
  },
  attendancePolicy: {
    halfDayHours: 4,
  },
};

@Injectable()
export class ScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureSchedule(companyId: string, actorId = "system") {
    let schedule = await this.prisma.workSchedule.findUnique({
      where: { companyId },
    });
    if (!schedule) {
      schedule = await this.prisma.workSchedule.create({
        data: {
          companyId,
          config: DEFAULT_CONFIG,
          metadata: DEFAULT_METADATA,
          createdBy: actorId,
          updatedBy: actorId,
        },
      });
    }
    return schedule;
  }

  async get(companyId: string) {
    const schedule = await this.ensureSchedule(companyId);
    const holidays = await this.prisma.holiday.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { date: "asc" },
    });
    const cfg = (schedule.config as Record<string, unknown>) ?? DEFAULT_CONFIG;
    return {
      id: schedule.id,
      workingDays: cfg.workingDays ?? DEFAULT_CONFIG.workingDays,
      weekendDays: cfg.weekendDays ?? DEFAULT_CONFIG.weekendDays,
      wfhDays: cfg.wfhDays ?? [],
      fromTime: cfg.fromTime ?? DEFAULT_CONFIG.fromTime,
      toTime: cfg.toTime ?? DEFAULT_CONFIG.toTime,
      gracePeriodMinutes:
        cfg.gracePeriodMinutes ?? DEFAULT_CONFIG.gracePeriodMinutes,
      breakMinutes: cfg.breakMinutes ?? DEFAULT_CONFIG.breakMinutes,
      holidays: holidays.map((h) => ({
        id: h.id,
        name: h.name,
        description: h.description,
        date: dateOnly(h.date),
        type: h.type,
        ...auditFields(h),
      })),
      ...auditFields(schedule),
    };
  }

  async patch(
    companyId: string,
    actorId: string,
    body: Record<string, unknown>
  ) {
    const schedule = await this.ensureSchedule(companyId, actorId);
    const current = (schedule.config as Record<string, unknown>) ?? {};
    const next = { ...current };
    for (const key of [
      "workingDays",
      "weekendDays",
      "wfhDays",
      "fromTime",
      "toTime",
      "gracePeriodMinutes",
      "breakMinutes",
    ]) {
      if (key in body) next[key] = body[key];
    }

    const currentMeta =
      schedule.metadata && typeof schedule.metadata === "object"
        ? ({ ...(schedule.metadata as object) } as Record<string, unknown>)
        : { ...DEFAULT_METADATA };
    let nextMeta = currentMeta;
    if (body.metadata && typeof body.metadata === "object") {
      const incoming = body.metadata as Record<string, unknown>;
      nextMeta = {
        ...currentMeta,
        ...incoming,
        wfhPolicy: {
          ...((currentMeta.wfhPolicy as object) ?? {}),
          ...((incoming.wfhPolicy as object) ?? {}),
        },
        attendancePolicy: {
          ...((currentMeta.attendancePolicy as object) ?? {}),
          ...((incoming.attendancePolicy as object) ?? {}),
        },
        deductionPolicy:
          incoming.deductionPolicy !== undefined
            ? incoming.deductionPolicy
            : currentMeta.deductionPolicy,
      };
    }

    await this.prisma.workSchedule.update({
      where: { id: schedule.id },
      data: {
        config: next as Prisma.InputJsonValue,
        metadata: nextMeta as Prisma.InputJsonValue,
        updatedBy: actorId,
        version: { increment: 1 },
      },
    });
    return this.get(companyId);
  }

  async listHolidays(companyId: string, type?: string, from?: string) {
    const rows = await this.prisma.holiday.findMany({
      where: {
        companyId,
        deletedAt: null,
        ...(type ? { type } : {}),
        ...(from ? { date: { gte: parseDate(from) } } : {}),
      },
      orderBy: { date: "asc" },
    });
    return rows.map((h) => ({
      id: h.id,
      name: h.name,
      description: h.description,
      date: dateOnly(h.date),
      type: h.type,
      ...auditFields(h),
    }));
  }

  async addHoliday(
    companyId: string,
    actorId: string,
    body: { name: string; date: string; type: string; description?: string }
  ) {
    const schedule = await this.ensureSchedule(companyId, actorId);
    const row = await this.prisma.holiday.create({
      data: {
        companyId,
        scheduleId: schedule.id,
        name: body.name,
        description: body.description ?? "",
        date: parseDate(body.date),
        type: body.type,
        createdBy: actorId,
        updatedBy: actorId,
      },
    });
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      date: dateOnly(row.date),
      type: row.type,
      ...auditFields(row),
    };
  }

  async removeHoliday(companyId: string, actorId: string, id: string) {
    const current = await this.prisma.holiday.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!current) throw new NotFoundException("Holiday not found");
    await this.prisma.holiday.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isArchived: true,
        updatedBy: actorId,
        version: { increment: 1 },
      },
    });
    return true;
  }
}
