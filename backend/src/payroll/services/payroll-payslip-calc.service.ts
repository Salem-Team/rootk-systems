import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { dateOnly, parseDate } from "../../common/mappers";
import { calculateEmployeePayslip } from "../../lib/payroll-engine";
import type {
  DayOfWeek,
  SchedulePayrollContext,
} from "../../lib/payroll-engine-types";
import type { PolicyPayload, SalaryPayload } from "../payroll.types";
import type { PeriodBounds } from "../payroll.helpers";
import {
  aggregateAttendanceOvertime,
  inferEarlyLeaveMinutes,
  isNightShiftHint,
  leaveDaysInPeriod,
  listWorkingDates,
  toEngineProfile,
} from "../payroll-attendance.helpers";
import { PayrollPoliciesService } from "./payroll-policies.service";

/** Computes a fresh payslip for one employee/period from attendance + leave + rules. */
@Injectable()
export class PayrollPayslipCalcService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policiesService: PayrollPoliciesService
  ) {}

  private async loadScheduleContext(companyId: string): Promise<{
    schedule: SchedulePayrollContext;
    holidayDates: Set<string>;
  }> {
    const scheduleRow = await this.prisma.workSchedule.findUnique({
      where: { companyId },
      include: { holidays: { where: { deletedAt: null } } },
    });
    const cfg = (scheduleRow?.config ?? {}) as Record<string, unknown>;
    const workingDays = (Array.isArray(cfg.workingDays)
      ? cfg.workingDays
      : ["sunday", "monday", "tuesday", "wednesday", "thursday"]) as DayOfWeek[];
    const weekendDays = (Array.isArray(cfg.weekendDays)
      ? cfg.weekendDays
      : ["friday", "saturday"]) as DayOfWeek[];
    const schedule: SchedulePayrollContext = {
      workingDays,
      weekendDays,
      gracePeriodMinutes: Number(cfg.gracePeriodMinutes ?? 15),
      breakMinutes: Number(cfg.breakMinutes ?? 60),
      fromTime: String(cfg.fromTime ?? "09:00"),
      toTime: String(cfg.toTime ?? "18:00"),
      minimumWorkingMinutes: Number(cfg.minimumWorkingMinutes ?? 480),
    };
    const holidayDates = new Set(
      (scheduleRow?.holidays ?? [])
        .filter((h) => h.type === "holiday")
        .map((h) => dateOnly(h.date))
    );
    return { schedule, holidayDates };
  }

  async computePayslip(
    companyId: string,
    employeeId: string,
    period: PeriodBounds,
    policy: PolicyPayload,
    profile: SalaryPayload
  ) {
    const [{ schedule, holidayDates }, rules, attendance, leaves] =
      await Promise.all([
        this.loadScheduleContext(companyId),
        this.policiesService.loadEngineRules(companyId),
        this.prisma.attendanceRecord.findMany({
          where: {
            companyId,
            employeeId,
            deletedAt: null,
            date: {
              gte: parseDate(period.startDate),
              lte: parseDate(period.endDate),
            },
          },
        }),
        this.prisma.leaveRequest.findMany({
          where: {
            companyId,
            employeeId,
            deletedAt: null,
            status: "approved",
            startDate: { lte: parseDate(period.endDate) },
            endDate: { gte: parseDate(period.startDate) },
          },
        }),
      ]);

    const asOf = dateOnly(new Date());
    const through = asOf < period.endDate ? asOf : period.endDate;
    const empLeaves = leaves.map((r) => ({
      id: r.id,
      type: r.type as "annual" | "sick" | "personal" | "unpaid" | "maternity" | "emergency",
      status: "approved" as const,
      startDate: dateOnly(r.startDate),
      endDate: dateOnly(r.endDate),
      days: leaveDaysInPeriod(
        dateOnly(r.startDate),
        dateOnly(r.endDate),
        period.startDate,
        period.endDate,
        schedule.workingDays,
        holidayDates,
        r.days
      ),
    }));

    const existingRows = attendance.map((r) => {
      const checkIn = r.checkIn ? r.checkIn.toISOString() : undefined;
      const checkOut = r.checkOut ? r.checkOut.toISOString() : undefined;
      return {
        date: dateOnly(r.date),
        status: r.status as
          | "present"
          | "absent"
          | "late"
          | "wfh"
          | "early_leave"
          | "half_day"
          | "on_leave",
        lateMinutes: r.lateMinutes,
        workingMinutes: r.workingMinutes,
        earlyLeaveMinutes: inferEarlyLeaveMinutes(
          r,
          schedule.minimumWorkingMinutes
        ),
        overtimeMinutes: r.overtimeMinutes ?? 0,
        checkIn,
        checkOut,
        isEarlyLeave: r.isEarlyLeave,
        isNightShift: isNightShiftHint(checkIn),
        isBusinessTrip: (r.note ?? "").toLowerCase().includes("trip"),
      };
    });

    const existingDates = new Set(existingRows.map((r) => r.date));
    const onLeave = (date: string) =>
      empLeaves.some((l) => l.startDate <= date && l.endDate >= date);

    const synthesizedAbsent = listWorkingDates(
      period.startDate,
      through,
      schedule.workingDays,
      holidayDates
    )
      .filter((date) => !existingDates.has(date) && !onLeave(date))
      .map((date) => ({
        date,
        status: "absent" as const,
        lateMinutes: 0,
        workingMinutes: 0,
        earlyLeaveMinutes: 0,
        overtimeMinutes: 0,
        isEarlyLeave: false,
      }));

    const attendanceRows = [...existingRows, ...synthesizedAbsent];
    const ot = aggregateAttendanceOvertime(
      attendanceRows,
      schedule,
      holidayDates
    );

    const engineProfile = toEngineProfile(employeeId, profile);
    const policies = {
      ...policy,
      id: "policy",
      companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "system",
      updatedBy: "system",
      deletedAt: null,
      isArchived: false,
      version: 1,
      metadata: {},
    } as unknown as import("../../lib/payroll-engine-types").PayrollPolicies;

    const slip = calculateEmployeePayslip({
      profile: engineProfile,
      policies,
      rules,
      period: {
        id: period.periodId,
        label: period.label,
        year: period.year,
        month: period.month,
        startDate: period.startDate,
        endDate: period.endDate,
        payDate: period.payDate,
        workingDays: period.workingDays,
        cycle: "monthly",
        paymentDay: policy.paymentDay ?? 1,
      },
      schedule,
      attendance: attendanceRows,
      leaves: empLeaves,
      overtimeHours: ot.regular,
      weekendOvertimeHours: ot.weekend,
      holidayOvertimeHours: ot.holiday,
      asOfDate: asOf,
    });

    return {
      ...slip,
      status: "draft",
      generatedAt: new Date().toISOString(),
      // legacy aliases for older aggregations
      attendanceDeduction: slip.attendanceDeductions,
      netPay: slip.net,
      overtimeMinutes: Math.round(
        (ot.regular + ot.weekend + ot.holiday) * 60
      ),
      basicSalary: profile.basicSalary,
    };
  }
}
