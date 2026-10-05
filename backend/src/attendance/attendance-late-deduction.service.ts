import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { SalaryPayload } from "../payroll/payroll.types";
import { countWorkingDaysInRange } from "../payroll/payroll-attendance.helpers";
import type { DayOfWeek } from "../lib/payroll-engine-types";
import { readEmployeeSchedules } from "../schedule/employee-schedule";
import { dateOnly } from "../common/mappers";
import {
  clockLateMinutes,
  doubledLateChargeMinutes,
  lateDeductionAmount,
} from "../lib/late-day-fraction";
import { timeToMinutes } from "../lib/work-time";

const DEFAULT_WORKING_DAYS: DayOfWeek[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
];

export type AttendanceLateDeduction = {
  dayFraction: number;
  chargedMinutes: number;
  amount: number | null;
  currency: string;
};

type AttendanceRow = {
  employeeId: string;
  date: string;
  checkIn?: string;
};

function asWorkingDays(value: unknown): DayOfWeek[] {
  if (!Array.isArray(value)) return DEFAULT_WORKING_DAYS;
  const days = value.filter(
    (day): day is DayOfWeek =>
      typeof day === "string" &&
      (DEFAULT_WORKING_DAYS as string[]).concat(["friday", "saturday"]).includes(day)
  );
  return days.length > 0 ? days : DEFAULT_WORKING_DAYS;
}

function monthBounds(dateKey: string): { start: string; end: string } {
  const [year, month] = dateKey.split("-");
  const y = Number(year);
  const m = Number(month);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const mm = String(m).padStart(2, "0");
  return {
    start: `${y}-${mm}-01`,
    end: `${y}-${mm}-${String(last).padStart(2, "0")}`,
  };
}

/** Attaches the doubled late-hour charge onto attendance rows. */
@Injectable()
export class AttendanceLateDeductionService {
  constructor(private readonly prisma: PrismaService) {}

  async enrich<T extends AttendanceRow>(
    companyId: string,
    rows: T[]
  ): Promise<(T & { lateDeduction?: AttendanceLateDeduction })[]> {
    if (rows.length === 0) return rows;

    const employeeIds = [...new Set(rows.map((row) => row.employeeId))];
    const [profiles, schedule] = await Promise.all([
      this.prisma.employeeSalaryProfile.findMany({
        where: { companyId, employeeId: { in: employeeIds } },
      }),
      this.prisma.workSchedule.findUnique({
        where: { companyId },
        include: { holidays: true },
      }),
    ]);

    const salaryByEmployee = new Map<string, { basic: number; currency: string }>();
    for (const profile of profiles) {
      const payload = profile.payload as SalaryPayload;
      salaryByEmployee.set(profile.employeeId, {
        basic: Number(payload.basicSalary) || 0,
        currency: payload.currency || "EGP",
      });
    }

    const config =
      schedule?.config && typeof schedule.config === "object"
        ? (schedule.config as Record<string, unknown>)
        : {};
    const companyDays = asWorkingDays(config.workingDays);
    const companyFrom = String(config.fromTime ?? "09:00");
    const companyTo = String(config.toTime ?? "17:00");
    const custom = readEmployeeSchedules(schedule?.metadata);
    const holidays = new Set(
      (schedule?.holidays ?? []).map((holiday) => dateOnly(holiday.date))
    );
    const daysCache = new Map<string, number>();

    const workingDaysFor = (employeeId: string, dateKey: string) => {
      const days = custom[employeeId]
        ? asWorkingDays(custom[employeeId].workingDays)
        : companyDays;
      const { start, end } = monthBounds(dateKey);
      const key = `${days.join(",")}|${start}|${[...holidays].join(",")}`;
      const cached = daysCache.get(key);
      if (cached != null) return cached;
      const count = countWorkingDaysInRange(start, end, days, holidays);
      daysCache.set(key, count);
      return count;
    };

    return rows.map((row) => {
      if (!row.checkIn) return row;
      const fromTime = custom[row.employeeId]?.fromTime ?? companyFrom;
      const toTime = custom[row.employeeId]?.toTime ?? companyTo;
      const clockLate = clockLateMinutes(row.checkIn, row.date, fromTime);
      const chargedMinutes = doubledLateChargeMinutes(clockLate);
      if (!chargedMinutes) return row;
      const minutesPerDay = Math.max(timeToMinutes(toTime) - timeToMinutes(fromTime), 60);
      const fraction = Math.round((chargedMinutes / minutesPerDay) * 1000) / 1000;
      const salary = salaryByEmployee.get(row.employeeId);
      const amount = lateDeductionAmount(
        fraction,
        salary?.basic ?? 0,
        workingDaysFor(row.employeeId, row.date)
      );
      return {
        ...row,
        lateDeduction: {
          dayFraction: fraction,
          chargedMinutes,
          amount,
          currency: salary?.currency ?? "EGP",
        },
      };
    });
  }
}
