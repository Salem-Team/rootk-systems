import { isApiMode } from "@/lib/env";
import { calculateEmployeePayslip } from "@/lib/payroll/engine";
import { todayKey } from "@/lib/mock-date";
import { dayOfWeekFromDateKey } from "@/lib/wfh-policy";
import {
  scheduledNetMinutes,
  timeToMinutes,
} from "@/lib/work-time";
import {
  countWorkingDaysInRange,
  listWorkingDates,
} from "@/lib/working-days";
import {
  fetchAllPayslips,
  fetchEmployeePayslip,
  fetchPayrollDashboard,
  fetchPayrollPolicies,
  fetchPayrollReports,
  fetchPayrollRules,
  fetchPayslipHistory,
  fetchSalaryProfile,
  patchPayrollPolicies,
  patchPayrollRuleToggle,
  postPayrollRunAdvance,
} from "@/api/payroll.api";
import {
  PAYROLL_PERIOD,
  mockPayslipHistory,
  payrollCalendarSeed,
  payrollPoliciesSeed,
  payrollRulesSeed,
  payrollRunSeed,
  payrollTimelineSeed,
  salaryProfilesSeed,
} from "@/mocks/payroll";
import {
  attendanceRepository,
  employeeRepository,
  leaveRepository,
  scheduleRepository,
  settingsRepository,
} from "@/repositories";
import { ForbiddenError } from "@/lib/errors";
import { fromError, ok } from "@/services/api-result";
import { simulateDelay } from "@/services/fake-api";
import {
  getSessionRole,
  getSessionUserId,
  getWorkEmployeeId,
} from "@/stores/session-store";
import { getStorageAdapter } from "@/storage";
import { StorageKeys } from "@/storage/keys";
import type { ApiResponse, Department } from "@/types";
import type {
  DepartmentPayrollRow,
  EmployeePayslip,
  EmployeeSalaryProfile,
  PayrollDashboardSummary,
  PayrollPersona,
  PayrollPolicies,
  PayrollReportBundle,
  PayrollRule,
  PayrollRun,
  PayrollRunStatus,
  PayslipHistoryItem,
  PayrollLeaveType,
  SchedulePayrollContext,
} from "@/types/payroll";

function hydratePolicies(): PayrollPolicies {
  const now = new Date().toISOString();
  return {
    ...payrollPoliciesSeed,
    companyId: "cmp_rootk_001",
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

async function syncCurrencyFromSettings(): Promise<void> {
  try {
    const settings = await settingsRepository.get();
    if (settings.currency && policiesState.currency !== settings.currency) {
      policiesState = {
        ...policiesState,
        currency: settings.currency,
        updatedAt: new Date().toISOString(),
        version: policiesState.version + 1,
      };
    }
  } catch {
    /* settings may be missing during first boot */
  }
}

function hydrateRules(): PayrollRule[] {
  const now = new Date().toISOString();
  return payrollRulesSeed.map((r) => ({
    ...r,
    companyId: "cmp_rootk_001",
    createdAt: now,
    updatedAt: now,
    createdBy: "system",
    updatedBy: "system",
    deletedAt: null,
    isArchived: false,
    version: 1,
    metadata: {},
  }));
}

let policiesState = hydratePolicies();
let rulesState = hydrateRules();
let runStatus: PayrollRunStatus = payrollRunSeed.status;
let profilesState: EmployeeSalaryProfile[] = [];
let payrollHydrated = false;

type PayrollPersistedState = {
  policies: PayrollPolicies;
  rules: PayrollRule[];
  runStatus: PayrollRunStatus;
  profiles?: EmployeeSalaryProfile[];
};

function seedProfiles(): EmployeeSalaryProfile[] {
  const now = new Date().toISOString();
  return salaryProfilesSeed.map((p) => ({
    ...p,
    companyId: "cmp_rootk_001",
    createdAt: now,
    updatedAt: now,
    createdBy: "system",
    updatedBy: "system",
    deletedAt: null,
    isArchived: false,
    version: 1,
    metadata: {},
  }));
}

function hydrateProfiles(): EmployeeSalaryProfile[] {
  if (profilesState.length === 0) {
    profilesState = seedProfiles();
  }
  return profilesState;
}

function defaultSalaryProfile(
  employeeId: string,
  joiningDate: string
): EmployeeSalaryProfile {
  const now = new Date().toISOString();
  const basic = 15000;
  const digits = employeeId.replace(/\D/g, "") || "000";
  return {
    id: `sal-${employeeId}`,
    employeeId,
    basicSalary: basic,
    allowances: {
      housing: Math.round(basic * 0.25),
      transportation: 1200,
      meal: 800,
      phone: 400,
      other: 300,
      shift: 0,
    },
    bonuses: 0,
    commission: 0,
    incentives: 0,
    manualAdjustments: 0,
    deductions: {
      insurance: Math.round(basic * 0.11),
      tax: Math.round(basic * 0.08),
      loan: 0,
      advances: 0,
      recurring: 150,
      penalties: 0,
    },
    salaryGrade: "G5",
    salaryType: "monthly",
    payrollGroup: "standard",
    currency: "EGP",
    bankAccount: `1002${digits.padStart(8, "0")}`,
    iban: `EG380002${digits.padStart(18, "0")}`,
    paymentMethod: "bank_transfer",
    insuranceStatus: "insured",
    taxStatus: "resident",
    contractType: "full_time",
    joiningDate,
    effectiveFrom: joiningDate,
    history: [
      {
        id: `hist-${employeeId}-1`,
        effectiveFrom: joiningDate,
        basicSalary: basic,
        note: "Initial salary",
      },
    ],
    incrementHistory: [],
    companyId: "cmp_rootk_001",
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

/** Ensure a new hire has a payslip profile in local mode. */
export async function ensureSalaryProfileForEmployee(input: {
  employeeId: string;
  joiningDate: string;
}): Promise<void> {
  if (isApiMode()) return;
  await ensurePayrollStateLoaded();
  const profiles = hydrateProfiles();
  if (profiles.some((p) => p.employeeId === input.employeeId)) return;
  profilesState = [
    ...profiles,
    defaultSalaryProfile(input.employeeId, input.joiningDate),
  ];
  await persistPayrollState();
}

async function ensurePayrollStateLoaded(): Promise<void> {
  if (payrollHydrated || isApiMode()) return;
  payrollHydrated = true;
  try {
    const storage = getStorageAdapter();
    const saved = await storage.getItem<PayrollPersistedState>(
      StorageKeys.payrollState
    );
    if (!saved) {
      profilesState = seedProfiles();
      return;
    }
    if (saved.policies) policiesState = { ...policiesState, ...saved.policies };
    if (Array.isArray(saved.rules) && saved.rules.length > 0) {
      rulesState = saved.rules;
    }
    if (saved.runStatus) runStatus = saved.runStatus;
    if (Array.isArray(saved.profiles) && saved.profiles.length > 0) {
      profilesState = saved.profiles;
    } else {
      profilesState = seedProfiles();
    }
  } catch {
    profilesState = seedProfiles();
  }
}

async function persistPayrollState(): Promise<void> {
  if (isApiMode()) return;
  try {
    await getStorageAdapter().setItem(StorageKeys.payrollState, {
      policies: policiesState,
      rules: rulesState,
      runStatus,
      profiles: hydrateProfiles(),
    } satisfies PayrollPersistedState);
  } catch {
    /* best-effort */
  }
}

/** Reset in-memory payroll cache after demo wipe. */
export function resetPayrollMemory(): void {
  policiesState = hydratePolicies();
  rulesState = hydrateRules();
  runStatus = payrollRunSeed.status;
  profilesState = [];
  payrollHydrated = false;
}

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

function inferEarlyLeaveMinutes(
  row: {
    earlyLeaveMinutes?: number;
    isEarlyLeave: boolean;
    workingMinutes: number;
  },
  scheduledNet: number
): number {
  if (typeof row.earlyLeaveMinutes === "number" && row.earlyLeaveMinutes > 0) {
    return row.earlyLeaveMinutes;
  }
  if (!row.isEarlyLeave) return 0;
  if (row.workingMinutes > 0 && scheduledNet > row.workingMinutes) {
    return scheduledNet - row.workingMinutes;
  }
  return Math.round(scheduledNet * 0.25);
}

function aggregateAttendanceOvertime(
  rows: {
    date: string;
    workingMinutes: number;
    overtimeMinutes?: number;
    checkOut?: string;
  }[],
  scheduleCtx: SchedulePayrollContext,
  holidayDates: Set<string>
): { regular: number; weekend: number; holiday: number } {
  let regular = 0;
  let weekend = 0;
  let holiday = 0;
  const minNet = scheduleCtx.minimumWorkingMinutes;

  for (const row of rows) {
    if (!row.checkOut && row.workingMinutes <= 0) continue;
    const day = dayOfWeekFromDateKey(row.date);
    const fromField = (row.overtimeMinutes ?? 0) / 60;
    const fromExcess = Math.max(0, (row.workingMinutes - minNet) / 60);
    const otHours = fromField > 0 ? fromField : fromExcess;

    if (holidayDates.has(row.date)) {
      holiday += otHours > 0 ? otHours : row.workingMinutes / 60;
    } else if (scheduleCtx.weekendDays.includes(day)) {
      weekend += row.workingMinutes / 60;
    } else {
      regular += otHours;
    }
  }

  return {
    regular: Math.round(regular * 100) / 100,
    weekend: Math.round(weekend * 100) / 100,
    holiday: Math.round(holiday * 100) / 100,
  };
}

function isNightShiftHint(checkIn?: string): boolean {
  if (!checkIn) return false;
  // Prefer the hour as written in the timestamp (company-local), not the device TZ.
  const match = checkIn.match(/T(\d{2}):/);
  if (match) {
    const hour = Number(match[1]);
    return hour >= 20 || hour < 6;
  }
  const timePart = checkIn.includes(" ")
    ? (checkIn.split(" ")[1] ?? checkIn)
    : checkIn;
  const hour = Number(timePart.split(":")[0] ?? Number.NaN);
  if (Number.isNaN(hour)) return false;
  return hour >= 20 || hour < 6;
}

/** Working-day overlap between a leave span and the payroll period. */
function leaveDaysInPeriod(
  startDate: string,
  endDate: string,
  periodStart: string,
  periodEnd: string,
  workingDays: string[],
  holidayDates: Set<string>,
  fallbackDays: number
): number {
  const start = startDate > periodStart ? startDate : periodStart;
  const end = endDate < periodEnd ? endDate : periodEnd;
  if (start > end) return 0;
  const counted = countWorkingDaysInRange(
    start,
    end,
    workingDays,
    holidayDates
  );
  return counted > 0 ? counted : fallbackDays;
}

async function buildPayslips(employeeId?: string): Promise<EmployeePayslip[]> {
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
  const profiles = hydrateProfiles().filter(
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

function aggregateRun(payslips: EmployeePayslip[]): PayrollRun {
  const now = new Date().toISOString();
  const netPayroll = payslips.reduce((s, p) => s + p.net, 0);
  return {
    id: payrollRunSeed.id,
    periodId: PAYROLL_PERIOD.id,
    status: runStatus,
    employeeCount: payslips.length,
    estimatedCost: payslips.reduce((s, p) => s + p.gross, 0),
    totalDeductions: payslips.reduce((s, p) => s + p.deductionsTotal, 0),
    totalOvertime: payslips.reduce((s, p) => s + p.overtimePay, 0),
    netPayroll,
    averageSalary:
      payslips.length > 0 ? Math.round(netPayroll / payslips.length) : 0,
    employerCostTotal: payslips.reduce((s, p) => s + p.employerCost, 0),
    pendingCount: runStatus === "paid" ? 0 : 3,
    generatedAt: payrollRunSeed.generatedAt,
    approvedAt:
      runStatus === "approved" || runStatus === "paid" ? now : undefined,
    paidAt: runStatus === "paid" ? now : undefined,
    companyId: "cmp_rootk_001",
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

function emptyDashboard(): PayrollDashboardSummary {
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

/** GET /payroll/dashboard */
export async function getPayrollDashboard(): Promise<
  ApiResponse<PayrollDashboardSummary>
> {
  if (isApiMode()) return fetchPayrollDashboard();
  try {
    await simulateDelay();
    const payslips = await buildPayslips();
    const run = aggregateRun(payslips);
    const processed =
      runStatus === "paid" || runStatus === "approved"
        ? run.employeeCount
        : Math.max(run.employeeCount - run.pendingCount, 0);
    return ok({
      period: PAYROLL_PERIOD,
      run,
      upcomingPayDate: PAYROLL_PERIOD.payDate,
      employeesIncluded: run.employeeCount,
      pendingPayroll: run.pendingCount,
      estimatedCost: run.estimatedCost,
      totalDeductions: run.totalDeductions,
      totalOvertime: run.totalOvertime,
      netPayroll: run.netPayroll,
      averageSalary: run.averageSalary,
      employeesProcessed: processed,
      timeline: payrollTimelineSeed,
      calendar: payrollCalendarSeed,
    });
  } catch (error) {
    return fromError(error, emptyDashboard());
  }
}

/** GET /payroll/profiles/:employeeId */
export async function getSalaryProfile(
  employeeId: string
): Promise<ApiResponse<EmployeeSalaryProfile | null>> {
  if (isApiMode()) return fetchSalaryProfile(employeeId);
  try {
    const scopedId =
      getSessionRole() === "employee" ? getWorkEmployeeId() : employeeId;
    await simulateDelay();
    await ensurePayrollStateLoaded();
    return ok(hydrateProfiles().find((p) => p.employeeId === scopedId) ?? null);
  } catch (error) {
    return fromError(error, null);
  }
}

/** GET /payroll/payslips/:employeeId */
export async function getEmployeePayslip(
  employeeId: string
): Promise<ApiResponse<EmployeePayslip | null>> {
  if (isApiMode()) return fetchEmployeePayslip(employeeId);
  try {
    const scopedId =
      getSessionRole() === "employee" ? getWorkEmployeeId() : employeeId;
    await simulateDelay();
    const list = await buildPayslips(scopedId);
    return ok(list[0] ?? null);
  } catch (error) {
    return fromError(error, null);
  }
}

/** GET /payroll/payslips/:employeeId/history */
export async function getPayslipHistory(
  employeeId: string
): Promise<ApiResponse<PayslipHistoryItem[]>> {
  if (isApiMode()) return fetchPayslipHistory(employeeId);
  try {
    const scopedId =
      getSessionRole() === "employee" ? getWorkEmployeeId() : employeeId;
    await simulateDelay();
    const current = await buildPayslips(scopedId);
    const history = mockPayslipHistory(scopedId).map((item) => {
      if (item.periodId === PAYROLL_PERIOD.id && current[0]) {
        return {
          ...item,
          net: current[0].net,
          gross: current[0].gross,
          status: runStatus,
        };
      }
      return item;
    });
    return ok(history);
  } catch (error) {
    return fromError(error, []);
  }
}

/** GET /payroll/payslips */
export async function getAllPayslips(): Promise<ApiResponse<EmployeePayslip[]>> {
  if (isApiMode()) return fetchAllPayslips();
  try {
    if (getSessionRole() !== "admin") {
      throw new ForbiddenError("Only admins can list all payslips");
    }
    await simulateDelay();
    return ok(await buildPayslips());
  } catch (error) {
    return fromError(error, []);
  }
}

/** GET /payroll/policies */
export async function getPayrollPolicies(): Promise<ApiResponse<PayrollPolicies>> {
  if (isApiMode()) return fetchPayrollPolicies();
  try {
    await simulateDelay();
    await ensurePayrollStateLoaded();
    await syncCurrencyFromSettings();
    return ok(policiesState);
  } catch (error) {
    return fromError(error, hydratePolicies());
  }
}

/** PATCH /payroll/policies */
export async function updatePayrollPolicies(
  patch: Partial<PayrollPolicies>
): Promise<ApiResponse<PayrollPolicies>> {
  if (isApiMode()) return patchPayrollPolicies(patch);
  try {
    if (getSessionRole() !== "admin") {
      throw new ForbiddenError("Only admins can update payroll policies");
    }
    await simulateDelay();
    await ensurePayrollStateLoaded();
    policiesState = {
      ...policiesState,
      ...patch,
      late: {
        ...policiesState.late,
        ...(patch.late ?? {}),
        tiers: patch.late?.tiers ?? policiesState.late.tiers,
      },
      leaveBehavior: {
        ...policiesState.leaveBehavior,
        ...(patch.leaveBehavior ?? {}),
      },
      leavePayFraction: {
        ...policiesState.leavePayFraction,
        ...(patch.leavePayFraction ?? {}),
      },
      updatedAt: new Date().toISOString(),
      version: policiesState.version + 1,
    };

    // Keep OT / night-shift rule amounts aligned with Policies (admin source of truth).
    rulesState = rulesState.map((r) => {
      if (r.when.field === "overtime_hours") {
        return {
          ...r,
          then: { ...r.then, amount: policiesState.overtimeRate },
          updatedAt: policiesState.updatedAt,
        };
      }
      if (r.when.field === "weekend_overtime") {
        return {
          ...r,
          then: { ...r.then, amount: policiesState.weekendOvertimeRate },
          updatedAt: policiesState.updatedAt,
        };
      }
      if (r.when.field === "holiday_overtime") {
        return {
          ...r,
          then: { ...r.then, amount: policiesState.holidayOvertimeRate },
          updatedAt: policiesState.updatedAt,
        };
      }
      if (r.when.field === "night_shift") {
        return {
          ...r,
          then: { ...r.then, amount: policiesState.nightShiftAllowance },
          updatedAt: policiesState.updatedAt,
        };
      }
      return r;
    });

    // Sync attendance grace so late minutes use the admin value.
    if (
      typeof policiesState.late.graceMinutes === "number" &&
      Number.isFinite(policiesState.late.graceMinutes)
    ) {
      try {
        const schedule = await scheduleRepository.get();
        if (schedule.gracePeriodMinutes !== policiesState.late.graceMinutes) {
          await scheduleRepository.update({
            gracePeriodMinutes: policiesState.late.graceMinutes,
          });
        }
      } catch {
        /* best-effort — policies still save */
      }
    }

    await persistPayrollState();
    return ok(policiesState, "Payroll policies updated");
  } catch (error) {
    return fromError(error, policiesState);
  }
}

/** GET /payroll/rules */
export async function getPayrollRules(): Promise<ApiResponse<PayrollRule[]>> {
  if (isApiMode()) return fetchPayrollRules();
  try {
    await simulateDelay();
    await ensurePayrollStateLoaded();
    return ok(rulesState);
  } catch (error) {
    return fromError(error, []);
  }
}

/** PATCH /payroll/rules/:id */
export async function togglePayrollRule(
  id: string,
  enabled: boolean
): Promise<ApiResponse<PayrollRule[]>> {
  if (isApiMode()) return patchPayrollRuleToggle(id, enabled);
  try {
    if (getSessionRole() !== "admin") {
      throw new ForbiddenError("Only admins can toggle payroll rules");
    }
    await simulateDelay();
    await ensurePayrollStateLoaded();
    rulesState = rulesState.map((r) =>
      r.id === id
        ? { ...r, enabled, updatedAt: new Date().toISOString(), version: r.version + 1 }
        : r
    );
    await persistPayrollState();
    return ok(rulesState, "Rule updated");
  } catch (error) {
    return fromError(error, rulesState);
  }
}

/** POST /payroll/runs/advance */
export async function advancePayrollStatus(): Promise<ApiResponse<PayrollRun>> {
  if (isApiMode()) return postPayrollRunAdvance();
  try {
    if (getSessionRole() !== "admin") {
      throw new ForbiddenError("Only admins can advance payroll status");
    }
    await simulateDelay();
    await ensurePayrollStateLoaded();
    const order: PayrollRunStatus[] = [
      "draft",
      "hr_review",
      "finance_review",
      "approved",
      "paid",
    ];
    const idx = order.indexOf(runStatus);
    if (idx >= 0 && idx < order.length - 1) runStatus = order[idx + 1];
    await persistPayrollState();
    const payslips = await buildPayslips();
    const run = aggregateRun(payslips);
    const { notifyPayrollAdvanced } = await import(
      "@/services/notification.service"
    );
    void notifyPayrollAdvanced({
      status: runStatus,
      actorId: getSessionUserId(),
      runId: run.id,
    });
    return ok(run, `Payroll moved to ${runStatus}`);
  } catch (error) {
    return fromError(error, aggregateRun([]));
  }
}

/** GET /payroll/reports */
export async function getPayrollReports(): Promise<
  ApiResponse<PayrollReportBundle>
> {
  const empty: PayrollReportBundle = {
    departmentRows: [],
    deductionAnalysis: [],
    overtimeCost: 0,
    attendanceCost: 0,
    leaveCost: 0,
    salaryCost: 0,
    monthlyComparison: [],
    yearlyComparison: [],
  };
  if (isApiMode()) return fetchPayrollReports();
  try {
    if (getSessionRole() !== "admin") {
      throw new ForbiddenError("Only admins can view payroll reports");
    }
    await simulateDelay();
    const [payslips, employees] = await Promise.all([
      buildPayslips(),
      employeeRepository.list(),
    ]);
    const byDept = new Map<Department, DepartmentPayrollRow>();
    for (const slip of payslips) {
      const emp = employees.find((e) => e.id === slip.employeeId);
      const dept = (emp?.department ?? "Operations") as Department;
      const row = byDept.get(dept) ?? {
        department: dept,
        headcount: 0,
        gross: 0,
        deductions: 0,
        overtime: 0,
        net: 0,
        employerCost: 0,
      };
      row.headcount += 1;
      row.gross += slip.gross;
      row.deductions += slip.deductionsTotal;
      row.overtime += slip.overtimePay;
      row.net += slip.net;
      row.employerCost += slip.employerCost;
      byDept.set(dept, row);
    }

    const salaryCost = payslips.reduce((s, p) => s + p.gross, 0);

    return ok({
      departmentRows: [...byDept.values()].sort((a, b) =>
        a.department.localeCompare(b.department)
      ),
      deductionAnalysis: [
        {
          label: "Attendance",
          amount: payslips.reduce((s, p) => s + p.attendanceDeductions, 0),
        },
        {
          label: "Leave",
          amount: payslips.reduce((s, p) => s + p.leaveDeductions, 0),
        },
        {
          label: "Insurance",
          amount: payslips.reduce((s, p) => s + p.insurance, 0),
        },
        {
          label: "Tax",
          amount: payslips.reduce((s, p) => s + p.tax, 0),
        },
        {
          label: "Loans & advances",
          amount: payslips.reduce((s, p) => s + p.loans + p.advances, 0),
        },
        {
          label: "Penalties",
          amount: payslips.reduce((s, p) => s + p.penalties, 0),
        },
      ],
      overtimeCost: payslips.reduce((s, p) => s + p.overtimePay, 0),
      attendanceCost: payslips.reduce((s, p) => s + p.attendanceDeductions, 0),
      leaveCost: payslips.reduce((s, p) => s + p.leaveDeductions, 0),
      salaryCost,
      monthlyComparison: [
        { month: "May", net: 410000, overtime: 12000 },
        { month: "Jun", net: 428000, overtime: 14500 },
        { month: "Jul", net: 435000, overtime: 13200 },
        {
          month: "Aug",
          net: payslips.reduce((s, p) => s + p.net, 0),
          overtime: payslips.reduce((s, p) => s + p.overtimePay, 0),
        },
      ],
      yearlyComparison: [
        { year: 2024, net: 4_800_000 },
        { year: 2025, net: 5_250_000 },
        {
          year: 2026,
          net: 5_250_000 + payslips.reduce((s, p) => s + p.net, 0),
        },
      ],
    });
  } catch (error) {
    return fromError(error, empty);
  }
}

/** Role → payroll persona for UI visibility (demo mapping). */
export function personaForRole(
  role: "admin" | "employee",
  preferred?: PayrollPersona
): PayrollPersona {
  if (role === "employee") return "employee";
  return preferred ?? "admin";
}

export function canViewAllPayroll(persona: PayrollPersona): boolean {
  return persona === "admin" || persona === "hr" || persona === "finance";
}

export function canEditPolicies(persona: PayrollPersona): boolean {
  return persona === "admin" || persona === "hr";
}

export function canApproveFinance(persona: PayrollPersona): boolean {
  return persona === "admin" || persona === "finance";
}
