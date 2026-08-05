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
  currency?: string;
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

function allowancesTotal(a: SalaryPayload["allowances"]): number {
  if (!a) return 0;
  return (
    (a.housing ?? 0) +
    (a.transportation ?? 0) +
    (a.meal ?? 0) +
    (a.phone ?? 0) +
    (a.other ?? 0) +
    (a.shift ?? 0)
  );
}

function lateDayFraction(lateMinutes: number, policy: PolicyPayload): number {
  const grace = policy.late?.graceMinutes ?? 15;
  const over = Math.max(0, lateMinutes - grace);
  if (over <= 0) return 0;
  const tiers = [...(policy.late?.tiers ?? [])].sort(
    (a, b) => a.afterMinutes - b.afterMinutes
  );
  let fraction = 0;
  for (const tier of tiers) {
    if (over >= tier.afterMinutes) fraction = tier.dayFraction;
  }
  return fraction;
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
    return { id: row.id, ...(row.payload as SalaryPayload) };
  }

  private async computePayslip(
    companyId: string,
    employeeId: string,
    period: ReturnType<typeof periodBounds>,
    policy: PolicyPayload,
    profile: SalaryPayload
  ) {
    const attendance = await this.prisma.attendanceRecord.findMany({
      where: {
        companyId,
        employeeId,
        deletedAt: null,
        date: {
          gte: parseDate(period.startDate),
          lte: parseDate(period.endDate),
        },
      },
    });

    const basic = profile.basicSalary;
    const allow = allowancesTotal(profile.allowances);
    const gross = basic + allow + (profile.bonuses ?? 0) + (profile.commission ?? 0);
    const daily = gross / Math.max(period.workingDays, 1);
    const hourly =
      daily / Math.max((policy.minimumWorkingMinutes ?? 480) / 60, 1);

    let absenceDays = 0;
    let halfDays = 0;
    let earlyDays = 0;
    let lateDayFrac = 0;
    let otMinutes = 0;
    let missingPunch = 0;

    for (const row of attendance) {
      if (row.status === "absent") absenceDays += 1;
      if (row.status === "half_day") halfDays += 1;
      if (row.status === "early_leave" || row.isEarlyLeave) {
        const frac = Math.min(
          policy.earlyLeaveDayFraction ?? 0.25,
          (row.earlyLeaveMinutes || 0) / Math.max(policy.minimumWorkingMinutes ?? 480, 1)
        );
        earlyDays += Math.max(frac, policy.earlyLeaveDayFraction ?? 0.25);
      }
      if (row.isLate || row.status === "late") {
        lateDayFrac += lateDayFraction(row.lateMinutes, policy);
      }
      otMinutes += row.overtimeMinutes ?? 0;
      if (row.checkIn && !row.checkOut && row.status !== "on_leave") {
        missingPunch += 1;
      }
    }

    const cap = policy.monthlyDeductionCap ?? 0.4;
    let dayFrac =
      absenceDays * (policy.absenceDayFraction ?? 1) +
      halfDays * (policy.halfDayFraction ?? 0.5) +
      earlyDays +
      lateDayFrac +
      missingPunch * (policy.missingPunchDayFraction ?? 0.5);
    dayFrac = Math.min(dayFrac, period.workingDays * cap);

    const attendanceDeduction = roundMoney(
      dayFrac * daily,
      policy.autoRounding
    );
    const overtimePay = roundMoney(
      (otMinutes / 60) * hourly * (policy.overtimeRate ?? 1.5),
      policy.autoRounding
    );
    const net = roundMoney(
      gross + overtimePay - attendanceDeduction,
      policy.autoRounding
    );
    const bonusesTotal = profile.bonuses ?? 0;
    const employeeCost = attendanceDeduction;
    const employerCost = roundMoney(net * 1.12, policy.autoRounding);

    const attendanceImpacts: Array<{
      id: string;
      kind: string;
      label: string;
      date: string;
      minutes?: number;
      dayFraction: number;
      amount: number;
    }> = [];
    for (const row of attendance) {
      const date = dateOnly(row.date);
      if (row.status === "absent") {
        attendanceImpacts.push({
          id: `abs-${date}`,
          kind: "absence",
          label: "absence",
          date,
          dayFraction: policy.absenceDayFraction ?? 1,
          amount: roundMoney(
            (policy.absenceDayFraction ?? 1) * daily,
            policy.autoRounding
          ),
        });
      }
      if (row.status === "half_day") {
        attendanceImpacts.push({
          id: `half-${date}`,
          kind: "half_day",
          label: "half_day",
          date,
          dayFraction: policy.halfDayFraction ?? 0.5,
          amount: roundMoney(
            (policy.halfDayFraction ?? 0.5) * daily,
            policy.autoRounding
          ),
        });
      }
      if (row.status === "early_leave" || row.isEarlyLeave) {
        const frac = Math.max(
          policy.earlyLeaveDayFraction ?? 0.25,
          Math.min(
            policy.earlyLeaveDayFraction ?? 0.25,
            (row.earlyLeaveMinutes || 0) /
              Math.max(policy.minimumWorkingMinutes ?? 480, 1)
          )
        );
        attendanceImpacts.push({
          id: `early-${date}`,
          kind: "early_leave",
          label: "early_leave",
          date,
          minutes: row.earlyLeaveMinutes || undefined,
          dayFraction: frac,
          amount: roundMoney(frac * daily, policy.autoRounding),
        });
      }
      if (row.isLate || row.status === "late") {
        const frac = lateDayFraction(row.lateMinutes, policy);
        if (frac > 0) {
          attendanceImpacts.push({
            id: `late-${date}`,
            kind: "late",
            label: "late_minutes",
            date,
            minutes: row.lateMinutes || undefined,
            dayFraction: frac,
            amount: roundMoney(frac * daily, policy.autoRounding),
          });
        }
      }
    }

    const lines = [
      {
        id: "basic",
        code: "basic",
        label: "Basic salary",
        category: "earning",
        amount: basic,
      },
      {
        id: "allowances",
        code: "allowances",
        label: "Allowances",
        category: "allowance",
        amount: allow,
      },
      {
        id: "overtime",
        code: "overtime",
        label: "Overtime",
        category: "overtime",
        amount: overtimePay,
      },
      {
        id: "attendance_deduction",
        code: "attendance_deduction",
        label: "Attendance deductions",
        category: "deduction",
        amount: -attendanceDeduction,
      },
    ].filter((l) => l.amount !== 0);

    return {
      employeeId,
      periodId: period.periodId,
      currency: profile.currency ?? policy.currency ?? "EGP",
      basicSalary: basic,
      allowancesTotal: allow,
      bonusesTotal,
      incentives: 0,
      manualAdjustments: 0,
      gross,
      overtimePay,
      overtimeMinutes: otMinutes,
      shiftAllowance: profile.allowances?.shift ?? 0,
      deductionsTotal: employeeCost,
      insurance: 0,
      tax: 0,
      loans: 0,
      advances: 0,
      penalties: 0,
      attendanceDeductions: attendanceDeduction,
      leaveDeductions: 0,
      net,
      employeeCost,
      employerCost,
      lines,
      attendanceImpacts,
      leaveImpacts: [],
      dailyRate: roundMoney(daily, policy.autoRounding),
      hourlyRate: roundMoney(hourly, policy.autoRounding),
      status: "draft",
      generatedAt: new Date().toISOString(),
      // legacy aliases kept for older dashboard aggregations / clients
      attendanceDeduction,
      netPay: net,
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
      totalDeductions += slip.attendanceDeductions;
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
    const rows = await this.prisma.employeePayslip.findMany({
      where: { companyId, ...(employeeId ? { employeeId } : {}) },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => this.toClientPayslip(r));
  }

  /**
   * Latest payslip for an employee. Computes + persists the current period
   * when no row exists yet (demo / first open before payroll advance).
   */
  async payslip(companyId: string, employeeId: string) {
    const row = await this.prisma.employeePayslip.findFirst({
      where: { companyId, employeeId },
      orderBy: { createdAt: "desc" },
    });
    if (row) {
      const payload = (row.payload ?? {}) as Record<string, unknown>;
      const hasClientShape =
        typeof payload.net === "number" &&
        Array.isArray(payload.attendanceImpacts) &&
        Array.isArray(payload.lines) &&
        (payload.lines as unknown[]).every(
          (l) => l && typeof (l as { id?: unknown }).id === "string"
        );
      if (hasClientShape) return this.toClientPayslip(row);
      // Rebuild legacy / incomplete payloads so the FE never crashes.
      return this.ensureCurrentPayslip(companyId, employeeId);
    }
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
