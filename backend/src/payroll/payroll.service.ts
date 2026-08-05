import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { dateOnly, parseDate } from "../common/mappers";
import { NotificationsService } from "../notifications/notifications.service";
import {
  DEFAULT_PAYROLL_POLICY,
  DEFAULT_PAYROLL_RULES,
  mergePolicy,
  policyJson,
} from "../lib/payroll-defaults";
import { calculateEmployeePayslip } from "../lib/payroll-engine";
import type {
  DayOfWeek,
  EmployeeSalaryProfile,
  PayrollRule,
  SchedulePayrollContext,
} from "../lib/payroll-engine-types";

type LateTier = { afterMinutes: number; dayFraction: number };

type PolicyPayload = ReturnType<typeof mergePolicy>;

type SalaryPayload = {
  basicSalary: number;
  allowances?: {
    housing?: number;
    transportation?: number;
    meal?: number;
    phone?: number;
    other?: number;
    shift?: number;
  };
  bonuses?: number;
  commission?: number;
  incentives?: number;
  manualAdjustments?: number;
  deductions?: {
    insurance?: number;
    tax?: number;
    loan?: number;
    advances?: number;
    recurring?: number;
    penalties?: number;
  };
  currency?: string;
  salaryType?: string;
  salaryGrade?: string;
  payrollGroup?: string;
  paymentMethod?: string;
  insuranceStatus?: string;
  taxStatus?: string;
  contractType?: string;
  bankAccount?: string;
  iban?: string;
  joiningDate?: string;
  effectiveFrom?: string;
  [key: string]: unknown;
};

const DEFAULT_POLICY = DEFAULT_PAYROLL_POLICY as PolicyPayload;

function roundMoney(value: number, mode?: string): number {
  switch (mode) {
    case "nearest_5":
      return Math.round(value / 5) * 5;
    case "nearest_10":
      return Math.round(value / 10) * 10;
    case "none":
      return Math.round(value * 100) / 100;
    default:
      return Math.round(value);
  }
}


const WEEK_DAYS: DayOfWeek[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function dayOfWeekFromDateKey(dateKey: string): DayOfWeek {
  const [y, m, d] = dateKey.split("-").map(Number);
  const utc = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  return WEEK_DAYS[utc.getUTCDay()];
}

function listWorkingDates(
  start: string,
  end: string,
  workingDays: DayOfWeek[],
  holidayDates: Set<string>
): string[] {
  const out: string[] = [];
  const cursor = parseDate(start);
  const last = parseDate(end);
  while (cursor <= last) {
    const key = dateOnly(cursor);
    const dow = dayOfWeekFromDateKey(key);
    if (workingDays.includes(dow) && !holidayDates.has(key)) out.push(key);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

function countWorkingDaysInRange(
  start: string,
  end: string,
  workingDays: DayOfWeek[],
  holidayDates: Set<string>
): number {
  return listWorkingDates(start, end, workingDays, holidayDates).length;
}

function leaveDaysInPeriod(
  startDate: string,
  endDate: string,
  periodStart: string,
  periodEnd: string,
  workingDays: DayOfWeek[],
  holidayDates: Set<string>,
  fallbackDays: number
): number {
  const start = startDate > periodStart ? startDate : periodStart;
  const end = endDate < periodEnd ? endDate : periodEnd;
  if (start > end) return 0;
  const counted = countWorkingDaysInRange(start, end, workingDays, holidayDates);
  return counted > 0 ? counted : fallbackDays;
}

function isNightShiftHint(checkIn?: string | null): boolean {
  if (!checkIn) return false;
  const match = checkIn.match(/T(\d{2}):/);
  if (!match) return false;
  const hour = Number(match[1]);
  return hour >= 20 || hour < 6;
}

function inferEarlyLeaveMinutes(
  row: {
    earlyLeaveMinutes?: number | null;
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
    checkOut?: string | null;
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

function toEngineProfile(
  employeeId: string,
  profile: SalaryPayload
): EmployeeSalaryProfile {
  const a = profile.allowances ?? {};
  const d = profile.deductions ?? {};
  const now = new Date().toISOString();
  return {
    id: `sal_${employeeId}`,
    employeeId,
    basicSalary: profile.basicSalary,
    allowances: {
      housing: a.housing ?? 0,
      transportation: a.transportation ?? 0,
      meal: a.meal ?? 0,
      phone: a.phone ?? 0,
      other: a.other ?? 0,
      shift: a.shift ?? 0,
    },
    bonuses: profile.bonuses ?? 0,
    commission: profile.commission ?? 0,
    incentives: profile.incentives ?? 0,
    manualAdjustments: profile.manualAdjustments ?? 0,
    deductions: {
      insurance: d.insurance ?? 0,
      tax: d.tax ?? 0,
      loan: d.loan ?? 0,
      advances: d.advances ?? 0,
      recurring: d.recurring ?? 0,
      penalties: d.penalties ?? 0,
    },
    salaryGrade: (profile.salaryGrade as EmployeeSalaryProfile["salaryGrade"]) ?? "G3",
    salaryType: (profile.salaryType as EmployeeSalaryProfile["salaryType"]) ?? "monthly",
    payrollGroup: (profile.payrollGroup as EmployeeSalaryProfile["payrollGroup"]) ?? "standard",
    currency: profile.currency ?? "EGP",
    bankAccount: String(profile.bankAccount ?? ""),
    iban: String(profile.iban ?? ""),
    paymentMethod: (profile.paymentMethod as EmployeeSalaryProfile["paymentMethod"]) ?? "bank_transfer",
    insuranceStatus: (profile.insuranceStatus as EmployeeSalaryProfile["insuranceStatus"]) ?? "insured",
    taxStatus: (profile.taxStatus as EmployeeSalaryProfile["taxStatus"]) ?? "resident",
    contractType: (profile.contractType as EmployeeSalaryProfile["contractType"]) ?? "full_time",
    joiningDate: String(profile.joiningDate ?? now.slice(0, 10)),
    effectiveFrom: String(profile.effectiveFrom ?? now.slice(0, 10)),
    history: [],
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

function periodBounds(now = new Date()) {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const periodId = `${year}-${String(month).padStart(2, "0")}`;
  const startDate = `${periodId}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const endDate = `${periodId}-${String(lastDay).padStart(2, "0")}`;
  const payDate = `${periodId}-${String(Math.min(28, lastDay)).padStart(2, "0")}`;
  return {
    periodId,
    year,
    month,
    startDate,
    endDate,
    payDate,
    workingDays: 22,
    label: periodId,
  };
}

@Injectable()
export class PayrollService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService
  ) {}

  private async policyDoc(companyId: string) {
    let doc = await this.prisma.payrollPoliciesDoc.findUnique({
      where: { companyId },
    });
    if (!doc) {
      doc = await this.prisma.payrollPoliciesDoc.create({
        data: { companyId, payload: policyJson() },
      });
    }
    return doc;
  }

  private async ensureRules(companyId: string) {
    const count = await this.prisma.payrollRule.count({ where: { companyId } });
    if (count > 0) return;
    for (const rule of DEFAULT_PAYROLL_RULES) {
      await this.prisma.payrollRule.create({
        data: {
          companyId,
          code: rule.code,
          labelKey: rule.name,
          enabled: rule.enabled,
          payload: {
            name: rule.name,
            priority: rule.priority,
            when: rule.when,
            then: rule.then,
            description: rule.description,
          } as unknown as Prisma.InputJsonValue,
        },
      });
    }
  }

  async policies(companyId: string) {
    const doc = await this.policyDoc(companyId);
    const payload = mergePolicy(doc.payload as Record<string, unknown>);
    return {
      id: doc.id,
      companyId,
      ...payload,
      version: doc.version,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
      createdBy: "system",
      updatedBy: "system",
      deletedAt: null,
      isArchived: false,
      metadata: {},
    };
  }

  async patchPolicies(companyId: string, body: Record<string, unknown>) {
    const current = await this.policies(companyId);
    const {
      id: _id,
      companyId: _cid,
      version: _ver,
      createdAt: _ca,
      updatedAt: _ua,
      createdBy: _cb,
      updatedBy: _ub,
      deletedAt: _da,
      isArchived: _ia,
      metadata: _md,
      ...rest
    } = current as Record<string, unknown>;
    void _id;
    void _cid;
    void _ver;
    void _ca;
    void _ua;
    void _cb;
    void _ub;
    void _da;
    void _ia;
    void _md;
    const merged = mergePolicy({ ...rest, ...body } as Record<string, unknown>);
    if (
      body.late &&
      typeof body.late === "object" &&
      rest.late &&
      typeof rest.late === "object"
    ) {
      const prevLate = rest.late as {
        graceMinutes?: number;
        tiers?: LateTier[];
      };
      const nextLate = body.late as {
        graceMinutes?: number;
        tiers?: LateTier[];
      };
      merged.late = {
        graceMinutes:
          nextLate.graceMinutes ??
          prevLate.graceMinutes ??
          DEFAULT_POLICY.late.graceMinutes,
        tiers: nextLate.tiers ?? prevLate.tiers ?? DEFAULT_POLICY.late.tiers,
      };
    }
    const doc = await this.prisma.payrollPoliciesDoc.update({
      where: { companyId },
      data: {
        payload: merged as unknown as Prisma.InputJsonValue,
        version: { increment: 1 },
      },
    });
    return this.policies(companyId);
  }

  async rules(companyId: string) {
    await this.ensureRules(companyId);
    const rows = await this.prisma.payrollRule.findMany({
      where: { companyId },
      orderBy: { code: "asc" },
    });
    return rows
      .map((r) => {
        const payload = (r.payload ?? {}) as Record<string, unknown>;
        return {
          id: r.id,
          companyId,
          name: (payload.name as string) ?? r.labelKey,
          enabled: r.enabled,
          priority: (payload.priority as number) ?? 100,
          when: payload.when ?? {
            field: "late_minutes",
            operator: "gt",
            value: 0,
          },
          then: payload.then ?? {
            action: "deduct_day_fraction",
            amount: 0,
          },
          description: (payload.description as string) ?? "",
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
          createdBy: "system",
          updatedBy: "system",
          deletedAt: null,
          isArchived: false,
          version: r.version,
          metadata: { code: r.code },
        };
      })
      .sort(
        (a, b) => (a.priority as number) - (b.priority as number)
      );
  }

  async toggleRule(companyId: string, id: string, enabled: boolean) {
    await this.prisma.payrollRule.updateMany({
      where: { id, companyId },
      data: { enabled },
    });
    return this.rules(companyId);
  }

  private async ensureSalary(
    companyId: string,
    employeeId: string,
    basicSalary: number
  ): Promise<SalaryPayload & { id: string }> {
    let row = await this.prisma.employeeSalaryProfile.findUnique({
      where: { companyId_employeeId: { companyId, employeeId } },
    });
    if (!row) {
      const payload: SalaryPayload = {
        basicSalary,
        allowances: {
          housing: Math.round(basicSalary * 0.1),
          transportation: 500,
          meal: 300,
          phone: 200,
          other: 0,
          shift: 0,
        },
        bonuses: 0,
        commission: 0,
        incentives: 0,
        manualAdjustments: 0,
        deductions: {
          insurance: Math.round(basicSalary * 0.11),
          tax: Math.round(basicSalary * 0.08),
          loan: 0,
          advances: 0,
          recurring: 150,
          penalties: 0,
        },
        currency: "EGP",
        salaryType: "monthly",
        salaryGrade: "G3",
        payrollGroup: "standard",
        paymentMethod: "bank_transfer",
        insuranceStatus: "insured",
        taxStatus: "resident",
        contractType: "full_time",
        bankAccount: `1002${employeeId.replace(/\D/g, "").padStart(8, "0").slice(-8)}`,
        iban: `EG380002${employeeId.replace(/\D/g, "").padStart(18, "0").slice(-18)}`,
        history: [],
        incrementHistory: [],
      };
      row = await this.prisma.employeeSalaryProfile.create({
        data: {
          companyId,
          employeeId,
          payload: payload as unknown as Prisma.InputJsonValue,
        },
      });
    }

    const payload = row.payload as SalaryPayload;
    const basic = payload.basicSalary ?? basicSalary;
    if (!payload.deductions) {
      payload.deductions = {
        insurance: Math.round(basic * 0.11),
        tax: Math.round(basic * 0.08),
        loan: 0,
        advances: 0,
        recurring: 150,
        penalties: 0,
      };
      await this.prisma.employeeSalaryProfile.update({
        where: { id: row.id },
        data: { payload: payload as unknown as Prisma.InputJsonValue },
      });
    }

    return { id: row.id, ...payload };
  }

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

  private async loadEngineRules(companyId: string): Promise<PayrollRule[]> {
    await this.ensureRules(companyId);
    const rows = await this.prisma.payrollRule.findMany({ where: { companyId } });
    return rows.map((row, index) => {
      const p = (row.payload ?? {}) as Record<string, unknown>;
      const when = (p.when ?? {}) as Record<string, unknown>;
      const then = (p.then ?? {}) as Record<string, unknown>;
      const now = new Date().toISOString();
      return {
        id: row.id,
        name: String(p.name ?? row.labelKey ?? row.code),
        enabled: row.enabled,
        priority: Number(p.priority ?? (index + 1) * 10),
        when: {
          field: String(when.field ?? "late_minutes") as PayrollRule["when"]["field"],
          operator: String(when.operator ?? "gt") as PayrollRule["when"]["operator"],
          value: Number(when.value ?? 0),
        },
        then: {
          action: String(then.action ?? "deduct_fixed") as PayrollRule["then"]["action"],
          amount: Number(then.amount ?? 0),
        },
        description: String(p.description ?? ""),
        companyId,
        createdAt: row.createdAt?.toISOString?.() ?? now,
        updatedAt: row.updatedAt?.toISOString?.() ?? now,
        createdBy: "system",
        updatedBy: "system",
        deletedAt: null,
        isArchived: false,
        version: row.version,
        metadata: {},
      };
    });
  }

  private async computePayslip(
    companyId: string,
    employeeId: string,
    period: ReturnType<typeof periodBounds>,
    policy: PolicyPayload,
    profile: SalaryPayload
  ) {
    const [{ schedule, holidayDates }, rules, attendance, leaves] =
      await Promise.all([
        this.loadScheduleContext(companyId),
        this.loadEngineRules(companyId),
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
    } as unknown as import("../lib/payroll-engine-types").PayrollPolicies;

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

  /** Normalize stored payslip payload to the frontend EmployeePayslip shape. */
  private toClientPayslip(
    row: { id: string; employeeId: string; periodId: string; payload: unknown }
  ) {
    const p = (row.payload ?? {}) as Record<string, unknown>;
    const net =
      typeof p.net === "number"
        ? p.net
        : typeof p.netPay === "number"
          ? (p.netPay as number)
          : 0;
    const attendanceDeductions =
      typeof p.attendanceDeductions === "number"
        ? (p.attendanceDeductions as number)
        : typeof p.attendanceDeduction === "number"
          ? (p.attendanceDeduction as number)
          : 0;
    const linesRaw = Array.isArray(p.lines) ? p.lines : [];
    const lines = linesRaw.map((line, i) => {
      const l = line as Record<string, unknown>;
      const amount = typeof l.amount === "number" ? l.amount : 0;
      const code = String(l.code ?? `line_${i}`);
      return {
        id: String(l.id ?? code),
        code,
        label: String(l.label ?? code),
        category: String(
          l.category ?? (amount < 0 ? "deduction" : "earning")
        ),
        amount,
      };
    });

    return {
      id: row.id,
      employeeId: row.employeeId,
      periodId: row.periodId,
      currency: String(p.currency ?? "EGP"),
      gross: Number(p.gross ?? 0),
      allowancesTotal: Number(p.allowancesTotal ?? 0),
      bonusesTotal: Number(p.bonusesTotal ?? 0),
      incentives: Number(p.incentives ?? 0),
      manualAdjustments: Number(p.manualAdjustments ?? 0),
      overtimePay: Number(p.overtimePay ?? 0),
      shiftAllowance: Number(p.shiftAllowance ?? 0),
      deductionsTotal: Number(p.deductionsTotal ?? attendanceDeductions),
      insurance: Number(p.insurance ?? 0),
      tax: Number(p.tax ?? 0),
      loans: Number(p.loans ?? 0),
      advances: Number(p.advances ?? 0),
      penalties: Number(p.penalties ?? 0),
      attendanceDeductions,
      leaveDeductions: Number(p.leaveDeductions ?? 0),
      net,
      employeeCost: Number(p.employeeCost ?? attendanceDeductions),
      employerCost: Number(p.employerCost ?? Math.round(net * 1.12)),
      lines,
      attendanceImpacts: Array.isArray(p.attendanceImpacts)
        ? p.attendanceImpacts
        : [],
      leaveImpacts: Array.isArray(p.leaveImpacts) ? p.leaveImpacts : [],
      dailyRate: Number(p.dailyRate ?? 0),
      hourlyRate: Number(p.hourlyRate ?? 0),
    };
  }

  private toHistoryItem(row: {
    id: string;
    periodId: string;
    payload: unknown;
  }) {
    const slip = this.toClientPayslip({
      id: row.id,
      employeeId: "",
      periodId: row.periodId,
      payload: row.payload,
    });
    return {
      id: row.id,
      periodId: row.periodId,
      periodLabel: row.periodId,
      payDate: `${row.periodId}-28`,
      net: slip.net,
      gross: slip.gross,
      status: "calculated" as const,
    };
  }

  async advance(companyId: string, actorId = "system") {
    const period = periodBounds();
    const policyDoc = await this.policyDoc(companyId);
    const policy = mergePolicy(policyDoc.payload as Record<string, unknown>);

    const employees = await this.prisma.employee.findMany({
      where: { companyId, deletedAt: null, status: { in: ["active", "on_leave"] } },
    });

    const payslips = [];
    let totalDeductions = 0;
    let totalOvertime = 0;
    let netPayroll = 0;
    let estimatedCost = 0;

    const baseSalaries = [28000, 22000, 18000, 20000];

    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];
      const profile = await this.ensureSalary(
        companyId,
        emp.id,
        baseSalaries[i % baseSalaries.length]
      );
      const slip = await this.computePayslip(
        companyId,
        emp.id,
        period,
        policy,
        profile
      );
      payslips.push(slip);
      totalDeductions += slip.deductionsTotal;
      totalOvertime += slip.overtimePay;
      netPayroll += slip.net;
      estimatedCost += slip.employerCost;

      await this.prisma.employeePayslip.upsert({
        where: {
          companyId_employeeId_periodId: {
            companyId,
            employeeId: emp.id,
            periodId: period.periodId,
          },
        },
        create: {
          companyId,
          employeeId: emp.id,
          periodId: period.periodId,
          payload: slip as unknown as Prisma.InputJsonValue,
        },
        update: { payload: slip as unknown as Prisma.InputJsonValue, version: { increment: 1 } },
      });
    }

    const runPayload = {
      id: `run_${period.periodId}`,
      companyId,
      periodId: period.periodId,
      status: "calculated",
      employeeCount: employees.length,
      estimatedCost: roundMoney(estimatedCost),
      totalDeductions: roundMoney(totalDeductions),
      totalOvertime: roundMoney(totalOvertime),
      netPayroll: roundMoney(netPayroll),
      averageSalary:
        employees.length > 0
          ? roundMoney(netPayroll / employees.length)
          : 0,
      employerCostTotal: roundMoney(estimatedCost),
      pendingCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: actorId,
      updatedBy: actorId,
      deletedAt: null,
      isArchived: false,
      version: 1,
      metadata: {},
    };

    await this.prisma.payrollRun.create({
      data: {
        companyId,
        periodId: period.periodId,
        status: "calculated",
        payload: runPayload,
      },
    });

    await this.notifications.notifyDomain({
      companyId,
      actorId,
      category: "payroll",
      priority: "high",
      audience: "admin",
      titleKey: "notifications.payrollRunTitle",
      bodyKey: "notifications.payrollRunBody",
      vars: { period: period.periodId, net: runPayload.netPayroll },
      href: "/payroll",
      entityType: "payroll_run",
      entityId: runPayload.id,
    });

    return runPayload;
  }

  async dashboard(companyId: string) {
    const period = periodBounds();
    const headcount = await this.prisma.employee.count({
      where: { companyId, deletedAt: null, status: "active" },
    });
    const latestRun = await this.prisma.payrollRun.findFirst({
      where: { companyId, periodId: period.periodId },
      orderBy: { createdAt: "desc" },
    });
    const slips = await this.prisma.employeePayslip.findMany({
      where: { companyId, periodId: period.periodId },
    });

    let totalDeductions = 0;
    let totalOvertime = 0;
    let netPayroll = 0;
    let estimatedCost = 0;
    for (const s of slips) {
      const p = s.payload as {
        attendanceDeduction?: number;
        attendanceDeductions?: number;
        overtimePay?: number;
        netPay?: number;
        net?: number;
        employerCost?: number;
      };
      totalDeductions += p.attendanceDeductions ?? p.attendanceDeduction ?? 0;
      totalOvertime += p.overtimePay ?? 0;
      netPayroll += p.net ?? p.netPay ?? 0;
      estimatedCost += p.employerCost ?? 0;
    }

    const run =
      (latestRun?.payload as Record<string, unknown>) ??
      ({
        id: `run_${period.periodId}`,
        companyId,
        periodId: period.periodId,
        status: slips.length ? "calculated" : "draft",
        employeeCount: headcount,
        estimatedCost,
        totalDeductions,
        totalOvertime,
        netPayroll,
        averageSalary: headcount ? Math.round(netPayroll / headcount) : 0,
        employerCostTotal: estimatedCost,
        pendingCount: Math.max(0, headcount - slips.length),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: "system",
        updatedBy: "system",
        deletedAt: null,
        isArchived: false,
        version: 1,
        metadata: {},
      } as Record<string, unknown>);

    return {
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
        paymentDay: 28,
      },
      run,
      upcomingPayDate: period.payDate,
      employeesIncluded: headcount,
      pendingPayroll: Math.max(0, headcount - slips.length),
      estimatedCost,
      totalDeductions,
      totalOvertime,
      netPayroll,
      averageSalary: headcount ? Math.round(netPayroll / headcount) : 0,
      employeesProcessed: slips.length,
      timeline: [],
      calendar: [],
    };
  }

  async reports(companyId: string) {
    const period = periodBounds();
    const slips = await this.prisma.employeePayslip.findMany({
      where: { companyId, periodId: period.periodId },
    });
    const employees = await this.prisma.employee.findMany({
      where: { companyId, deletedAt: null },
    });
    const byDept = new Map<string, { gross: number; net: number; count: number }>();
    let overtimeCost = 0;
    let attendanceCost = 0;
    let salaryCost = 0;

    for (const slip of slips) {
      const emp = employees.find((e) => e.id === slip.employeeId);
      const dept = emp?.department ?? "Other";
      const p = slip.payload as {
        gross?: number;
        netPay?: number;
        net?: number;
        overtimePay?: number;
        attendanceDeduction?: number;
        attendanceDeductions?: number;
        basicSalary?: number;
      };
      const bucket = byDept.get(dept) ?? { gross: 0, net: 0, count: 0 };
      bucket.gross += p.gross ?? 0;
      bucket.net += p.net ?? p.netPay ?? 0;
      bucket.count += 1;
      byDept.set(dept, bucket);
      overtimeCost += p.overtimePay ?? 0;
      attendanceCost += p.attendanceDeductions ?? p.attendanceDeduction ?? 0;
      salaryCost += p.basicSalary ?? 0;
    }

    return {
      departmentRows: [...byDept.entries()].map(([department, v]) => ({
        department,
        employees: v.count,
        gross: Math.round(v.gross),
        net: Math.round(v.net),
      })),
      deductionAnalysis: [
        { kind: "attendance", amount: Math.round(attendanceCost) },
        { kind: "overtime_offset", amount: Math.round(overtimeCost) },
      ],
      overtimeCost: Math.round(overtimeCost),
      attendanceCost: Math.round(attendanceCost),
      leaveCost: 0,
      salaryCost: Math.round(salaryCost),
      monthlyComparison: [],
      yearlyComparison: [],
    };
  }

  async payslips(companyId: string, employeeId?: string) {
    if (employeeId) {
      return [await this.ensureCurrentPayslip(companyId, employeeId)];
    }
    const employees = await this.prisma.employee.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: { in: ["active", "on_leave"] },
      },
      orderBy: { employeeCode: "asc" },
    });
    const slips = [];
    for (const emp of employees) {
      slips.push(await this.ensureCurrentPayslip(companyId, emp.id));
    }
    return slips;
  }

  /**
   * Latest payslip for an employee. Computes + persists the current period
   * when no row exists yet (demo / first open before payroll advance).
   */
  async payslip(companyId: string, employeeId: string) {
    // Always recompute the current period so profile/policy/attendance stay accurate.
    return this.ensureCurrentPayslip(companyId, employeeId);
  }

  async history(companyId: string, employeeId: string) {
    let rows = await this.prisma.employeePayslip.findMany({
      where: { companyId, employeeId },
      orderBy: { createdAt: "desc" },
    });
    if (!rows.length) {
      await this.ensureCurrentPayslip(companyId, employeeId);
      rows = await this.prisma.employeePayslip.findMany({
        where: { companyId, employeeId },
        orderBy: { createdAt: "desc" },
      });
    }
    return rows.map((r) => this.toHistoryItem(r));
  }

  private async ensureCurrentPayslip(companyId: string, employeeId: string) {
    const period = periodBounds();
    const policyDoc = await this.policyDoc(companyId);
    const policy = mergePolicy(policyDoc.payload as Record<string, unknown>);
    const profile = await this.ensureSalary(companyId, employeeId, 18000);
    const slip = await this.computePayslip(
      companyId,
      employeeId,
      period,
      policy,
      profile
    );
    const row = await this.prisma.employeePayslip.upsert({
      where: {
        companyId_employeeId_periodId: {
          companyId,
          employeeId,
          periodId: period.periodId,
        },
      },
      create: {
        companyId,
        employeeId,
        periodId: period.periodId,
        payload: slip as unknown as Prisma.InputJsonValue,
      },
      update: { payload: slip as unknown as Prisma.InputJsonValue, version: { increment: 1 } },
    });
    return this.toClientPayslip(row);
  }

  async salaryProfile(companyId: string, employeeId: string) {
    const employees = await this.prisma.employee.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { employeeCode: "asc" },
    });
    const idx = Math.max(
      0,
      employees.findIndex((e) => e.id === employeeId)
    );
    const bases = [28000, 22000, 18000, 20000];
    const profile = await this.ensureSalary(
      companyId,
      employeeId,
      bases[idx % bases.length]
    );
    const emp = employees.find((e) => e.id === employeeId);
    const basic = profile.basicSalary ?? bases[idx % bases.length];
    const allowances = {
      housing: profile.allowances?.housing ?? Math.round(basic * 0.1),
      transportation: profile.allowances?.transportation ?? 500,
      meal: profile.allowances?.meal ?? 300,
      phone: profile.allowances?.phone ?? 200,
      other: profile.allowances?.other ?? 0,
      shift: profile.allowances?.shift ?? 0,
    };
    const deductionsRaw = (profile.deductions ?? {}) as Record<string, number>;
    const joiningDate = emp ? dateOnly(emp.joinDate) : new Date().toISOString().slice(0, 10);
    const { id: profileId } = profile;
    return {
      id: profileId,
      employeeId,
      companyId,
      basicSalary: basic,
      allowances,
      bonuses: profile.bonuses ?? 0,
      commission: profile.commission ?? 0,
      incentives: Number(profile.incentives ?? 0),
      manualAdjustments: Number(profile.manualAdjustments ?? 0),
      deductions: {
        insurance: deductionsRaw.insurance ?? Math.round(basic * 0.11),
        tax: deductionsRaw.tax ?? Math.round(basic * 0.08),
        loan: deductionsRaw.loan ?? 0,
        advances: deductionsRaw.advances ?? 0,
        recurring: deductionsRaw.recurring ?? 150,
        penalties: deductionsRaw.penalties ?? 0,
      },
      salaryGrade: profile.salaryGrade ?? "G3",
      salaryType: profile.salaryType ?? "monthly",
      payrollGroup: profile.payrollGroup === "default" ? "standard" : (profile.payrollGroup ?? "standard"),
      currency: profile.currency ?? "EGP",
      bankAccount:
        (profile.bankAccount as string | undefined) ??
        `1002${employeeId.replace(/\D/g, "").padStart(8, "0").slice(-8)}`,
      iban:
        (profile.iban as string | undefined) ??
        `EG380002${employeeId.replace(/\D/g, "").padStart(18, "0").slice(-18)}`,
      paymentMethod:
        profile.paymentMethod === "bank"
          ? "bank_transfer"
          : (profile.paymentMethod ?? "bank_transfer"),
      insuranceStatus: profile.insuranceStatus ?? "insured",
      taxStatus:
        profile.taxStatus === "taxable"
          ? "resident"
          : (profile.taxStatus ?? "resident"),
      contractType: profile.contractType ?? "full_time",
      joiningDate,
      effectiveFrom: joiningDate,
      history: Array.isArray(profile.history) ? profile.history : [],
      incrementHistory: Array.isArray(profile.incrementHistory)
        ? profile.incrementHistory
        : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "system",
      updatedBy: "system",
      deletedAt: null,
      isArchived: false,
      version: 1,
      metadata: {},
    };
  }
}
