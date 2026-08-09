import { DEFAULT_COMPANY_ID } from "@/constants/company";
import { calculateEmployeePayslip } from "@/lib/payroll/engine";
import { todayKey } from "@/lib/mock-date";
import { scheduledNetMinutes, timeToMinutes } from "@/lib/work-time";
import { listWorkingDates } from "@/lib/working-days";
import {
  PAYROLL_PERIOD,
  payrollRunSeed,
} from "@/mocks/payroll";
import {
  attendanceRepository,
  employeeRepository,
  leaveRepository,
  scheduleRepository,
} from "@/repositories";
import type {
  EmployeePayslip,
  PayrollDashboardSummary,
  PayrollLeaveType,
  PayrollRun,
  SchedulePayrollContext,
} from "@/types/payroll";
import {
  aggregateAttendanceOvertime,
  inferEarlyLeaveMinutes,
  isNightShiftHint,
  leaveDaysInPeriod,
} from "./attendance-helpers";
import {
  ensurePayrollStateLoaded,
  getPoliciesState,
  getProfilesState,
  getRulesState,
  getRunStatus,
  syncCurrencyFromSettings,
} from "./state";

async function resolveScheduleContext(): Promise<SchedulePayrollContext> {
  const schedule = await scheduleRepository.get();
  const span =
    timeToMinutes(schedule.toTime) - timeToMinutes(schedule.fromTime);
  const net = scheduledNetMinutes(
    schedule.fromTime,
    schedule.toTime,
    schedule.breakMinutes
  );
  return {
    workingDays: schedule.workingDays,
    weekendDays: schedule.weekendDays,
    gracePeriodMinutes: schedule.gracePeriodMinutes,
    breakMinutes: schedule.breakMinutes,
    fromTime: schedule.fromTime,
    toTime: schedule.toTime,
    minimumWorkingMinutes: Math.max(net, Math.max(span - schedule.breakMinutes, 1)),
  };
}

export async function buildPayslips(employeeId?: string): Promise<EmployeePayslip[]> {
  await ensurePayrollStateLoaded();
  await syncCurrencyFromSettings();
  const [attendance, leave, scheduleCtx, scheduleEntity, employees] =
    await Promise.all([
      attendanceRepository.list(),
      leaveRepository.list(),
      resolveScheduleContext(),
      scheduleRepository.get(),
      employeeRepository.list(),
    ]);
  const liveIds = new Set(
    employees
      .filter((e) => !e.deletedAt && e.status !== "inactive")
      .map((e) => e.id)
  );
  const profiles = getProfilesState().filter(
    (p) =>
      liveIds.has(p.employeeId) &&
      (!employeeId || p.employeeId === employeeId)
  );
  const period = PAYROLL_PERIOD;
  const inPeriod = (date: string) =>
    date >= period.startDate && date <= period.endDate;
  const holidayDates = new Set(
    scheduleEntity.holidays
      .filter((h) => h.type === "holiday")
      .map((h) => h.date)
  );
  const asOf = todayKey();
  const through = asOf < period.endDate ? asOf : period.endDate;
  const policiesState = getPoliciesState();
  const rulesState = getRulesState();

  return profiles.map((profile) => {
    const empLeaves = leave.filter(
      (r) =>
        r.employeeId === profile.employeeId &&
        r.status === "approved" &&
        r.startDate <= period.endDate &&
        r.endDate >= period.startDate
    );
    const existingRows = attendance.filter(
      (r) => r.employeeId === profile.employeeId && inPeriod(r.date)
    );
    const existingDates = new Set(existingRows.map((r) => r.date));
    const onLeave = (date: string) =>
      empLeaves.some((l) => l.startDate <= date && l.endDate >= date);

    const synthesizedAbsent = listWorkingDates(
      period.startDate,
      through,
      scheduleCtx.workingDays,
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

    const attendanceRows = [
      ...existingRows.map((r) => ({
        date: r.date,
        status: r.status,
        lateMinutes: r.lateMinutes,
        workingMinutes: r.workingMinutes,
        earlyLeaveMinutes: inferEarlyLeaveMinutes(
          r,
          scheduleCtx.minimumWorkingMinutes
        ),
        overtimeMinutes: r.overtimeMinutes ?? 0,
        checkIn: r.checkIn,
        checkOut: r.checkOut,
        isEarlyLeave: r.isEarlyLeave,
        isNightShift: isNightShiftHint(r.checkIn),
        isBusinessTrip: r.note?.toLowerCase().includes("trip") ?? false,
      })),
      ...synthesizedAbsent,
    ];

    const ot = aggregateAttendanceOvertime(
      attendanceRows,
      scheduleCtx,
      holidayDates
    );

    return calculateEmployeePayslip({
      profile,
      policies: policiesState,
      rules: rulesState,
      period,
      schedule: scheduleCtx,
      attendance: attendanceRows,
      leaves: empLeaves.map((r) => ({
        id: r.id,
        type: r.type as PayrollLeaveType,
        status: r.status,
        startDate: r.startDate,
        endDate: r.endDate,
        days: leaveDaysInPeriod(
          r.startDate,
          r.endDate,
          period.startDate,
          period.endDate,
          scheduleCtx.workingDays,
          holidayDates,
          r.days
        ),
      })),
      overtimeHours: ot.regular,
      weekendOvertimeHours: ot.weekend,
      holidayOvertimeHours: ot.holiday,
      asOfDate: asOf,
    });
  });
}

export function aggregateRun(payslips: EmployeePayslip[]): PayrollRun {
  const now = new Date().toISOString();
  const runStatus = getRunStatus();
  const netPayroll = payslips.reduce((s, p) => s + p.net, 0);
  return {
    id: payrollRunSeed.id,
    periodId: PAYROLL_PERIOD.id,
    status: runStatus,
    employeeCount: payslips.length,
    estimatedCost: payslips.reduce((s, p) => s + p.employerCost, 0),
    totalDeductions: payslips.reduce((s, p) => s + p.deductionsTotal, 0),
    totalOvertime: payslips.reduce((s, p) => s + p.overtimePay, 0),
    netPayroll,
    averageSalary:
      payslips.length > 0 ? Math.round(netPayroll / payslips.length) : 0,
    employerCostTotal: payslips.reduce((s, p) => s + p.employerCost, 0),
    pendingCount: runStatus === "paid" || runStatus === "approved" ? 0 : payslips.length,
    generatedAt: payrollRunSeed.generatedAt,
    approvedAt:
      runStatus === "approved" || runStatus === "paid" ? now : undefined,
    paidAt: runStatus === "paid" ? now : undefined,
    companyId: DEFAULT_COMPANY_ID,
    createdAt: now,
    updatedAt: now,
    createdBy: "system",
    updatedBy: "system",
    deletedAt: null,
    isArchived: false,
    version: 1,
    metadata: {},
  };
}

export function emptyDashboard(): PayrollDashboardSummary {
  return {
    period: PAYROLL_PERIOD,
    run: aggregateRun([]),
    upcomingPayDate: PAYROLL_PERIOD.payDate,
    employeesIncluded: 0,
    pendingPayroll: 0,
    estimatedCost: 0,
    totalDeductions: 0,
    totalOvertime: 0,
    netPayroll: 0,
    averageSalary: 0,
    employeesProcessed: 0,
    timeline: [],
    calendar: [],
  };
}
