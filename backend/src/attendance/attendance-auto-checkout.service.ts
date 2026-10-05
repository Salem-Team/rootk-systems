import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { dateOnly } from "../common/mappers";
import {
  scheduleOnDay,
  settleWorkDay,
  type AttendanceStatus,
} from "../lib/work-time";
import { asMetadata } from "./attendance-mappers";
import { AttendanceSharedService } from "./attendance-shared.service";

const TICK_MS = 60_000;

/**
 * Closes open attendance at the scheduled end (17:00 by default)
 * once that time has passed. Checkout is the shift end, not "now".
 */
@Injectable()
export class AttendanceAutoCheckoutService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(AttendanceAutoCheckoutService.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private pending: Promise<number> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly shared: AttendanceSharedService
  ) {}

  onModuleInit() {
    void this.closeElapsed();
    this.timer = setInterval(() => {
      void this.closeElapsed();
    }, TICK_MS);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  closeElapsed(now = new Date(), companyId?: string): Promise<number> {
    if (this.pending) return this.pending;
    this.pending = this.runClose(now, companyId).finally(() => {
      this.pending = null;
    });
    return this.pending;
  }

  private async runClose(now: Date, companyId?: string): Promise<number> {
    try {
      const rows = await this.prisma.attendanceRecord.findMany({
        where: {
          checkIn: { not: null },
          checkOut: null,
          deletedAt: null,
          ...(companyId ? { companyId } : {}),
        },
      });
      const scheduleCache = new Map<
        string,
        Awaited<ReturnType<AttendanceSharedService["scheduleBundle"]>>
      >();
      let closed = 0;
      for (const row of rows) {
        if (!row.checkIn) continue;
        const cacheKey = `${row.companyId}:${row.employeeId}`;
        let schedule = scheduleCache.get(cacheKey);
        if (!schedule) {
          schedule = await this.shared.scheduleBundle(
            row.companyId,
            row.employeeId
          );
          scheduleCache.set(cacheKey, schedule);
        }
        const dateKey = dateOnly(row.date);
        const end = scheduleOnDay(dateKey, schedule.toTime);
        if (now < end || row.checkIn.getTime() >= end.getTime()) continue;

        const settled = settleWorkDay({
          dateKey,
          checkIn: row.checkIn,
          checkOut: end,
          schedule,
          previousStatus: row.status as AttendanceStatus,
          wasLate: row.isLate,
          lateMinutes: row.lateMinutes,
        });
        const metadata = asMetadata(row.metadata);
        metadata.autoCheckOut = true;

        await this.prisma.attendanceRecord.update({
          where: { id: row.id },
          data: {
            checkOut: end,
            workingMinutes: settled.workingMinutes,
            grossMinutes: settled.grossMinutes,
            breakAppliedMinutes: settled.breakAppliedMinutes,
            earlyLeaveMinutes: settled.earlyLeaveMinutes,
            overtimeMinutes: settled.overtimeMinutes,
            isEarlyLeave: settled.isEarlyLeave,
            isLate: settled.isLate,
            lateMinutes: settled.lateMinutes,
            status: settled.status,
            metadata: metadata as Prisma.InputJsonValue,
            updatedBy: "system",
            version: { increment: 1 },
          },
        });
        closed += 1;
      }
      if (closed > 0) {
        this.logger.log(`Auto check-out closed ${closed} open attendance day(s)`);
      }
      return closed;
    } catch (error) {
      this.logger.error(
        `Auto check-out failed: ${error instanceof Error ? error.message : "unknown"}`
      );
      return 0;
    }
  }
}
