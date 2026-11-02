import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import {
  normalizeRunStatus,
  periodBoundsFor,
  roundMoney,
} from "../payroll.helpers";
import { PayrollPoliciesService } from "./payroll-policies.service";
import { PayrollSalaryService } from "./payroll-salary.service";
import { PayrollPayslipCalcService } from "./payroll-payslip-calc.service";
import { PayrollPayslipQueryService } from "./payroll-payslip-query.service";

export type PeriodPayslipSource = "live" | "stored";

/** Live month preview + optional persist for any YYYY-MM period. */
@Injectable()
export class PayrollPeriodService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policiesService: PayrollPoliciesService,
    private readonly salaryService: PayrollSalaryService,
    private readonly payslipCalc: PayrollPayslipCalcService,
    private readonly payslipQuery: PayrollPayslipQueryService
  ) {}

  private async activeEmployees(companyId: string) {
    return this.prisma.employee.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: { in: ["active", "on_leave"] },
      },
      orderBy: { employeeCode: "asc" },
      select: {
        id: true,
        name: true,
        employeeCode: true,
        department: true,
        position: true,
        joinDate: true,
        status: true,
      },
    });
  }

  private summarize(
    slips: Array<{
      gross: number;
      net: number;
      deductionsTotal: number;
      overtimePay: number;
      employerCost: number;
    }>
  ) {
    let gross = 0;
    let net = 0;
    let deductions = 0;
    let overtime = 0;
    let employerCost = 0;
    for (const s of slips) {
      gross += s.gross;
      net += s.net;
      deductions += s.deductionsTotal;
      overtime += s.overtimePay;
      employerCost += s.employerCost;
    }
    const count = slips.length;
    return {
      employeeCount: count,
      grossTotal: roundMoney(gross),
      netPayroll: roundMoney(net),
      totalDeductions: roundMoney(deductions),
      totalOvertime: roundMoney(overtime),
      estimatedCost: roundMoney(employerCost),
      averageSalary: count > 0 ? roundMoney(net / count) : 0,
    };
  }

  private async computeLive(companyId: string, periodId: string) {
    let period;
    try {
      period = periodBoundsFor(periodId);
    } catch {
      throw new BadRequestException(`Invalid periodId: ${periodId}`);
    }

    const [policy, employees] = await Promise.all([
      this.policiesService.getMergedPolicy(companyId),
      this.activeEmployees(companyId),
    ]);

    const payslips = [];
    for (const emp of employees) {
      const profile = await this.salaryService.findSalary(companyId, emp.id);
      if (!profile) continue;
      // Skip months entirely before join.
      const join = emp.joinDate
        ? emp.joinDate.toISOString().slice(0, 10)
        : null;
      if (join && join > period.endDate) continue;

      const slip = await this.payslipCalc.computePayslip(
        companyId,
        emp.id,
        period,
        policy,
        profile
      );
      payslips.push({
        ...this.payslipQuery.toClientPayslip({
          id: slip.id,
          employeeId: emp.id,
          periodId: period.periodId,
          payload: slip,
        }),
        employeeName: emp.name,
        employeeCode: emp.employeeCode,
        department: emp.department,
        position: emp.position,
      });
    }

    return { period, payslips, totals: this.summarize(payslips) };
  }

  /**
   * Preview a month: use locked stored slips when paid/approved,
   * otherwise always compute live from attendance + policies.
   */
  async preview(companyId: string, periodId: string) {
    let period;
    try {
      period = periodBoundsFor(periodId);
    } catch {
      throw new BadRequestException(`Invalid periodId: ${periodId}`);
    }

    const latestRun = await this.prisma.payrollRun.findFirst({
      where: { companyId, periodId: period.periodId },
      orderBy: { createdAt: "desc" },
    });
    const runStatus = normalizeRunStatus(latestRun?.status);
    const locked = runStatus === "paid" || runStatus === "approved";

    if (locked) {
      const rows = await this.prisma.employeePayslip.findMany({
        where: { companyId, periodId: period.periodId },
        orderBy: { createdAt: "asc" },
      });
      const employees = await this.activeEmployees(companyId);
      const byId = new Map(employees.map((e) => [e.id, e]));
      const payslips = rows.map((row) => {
        const emp = byId.get(row.employeeId);
        return {
          ...this.payslipQuery.toClientPayslip(row),
          employeeName: emp?.name,
          employeeCode: emp?.employeeCode,
          department: emp?.department,
          position: emp?.position,
        };
      });
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
          cycle: "monthly" as const,
          paymentDay: 28,
        },
        runStatus,
        source: "stored" as PeriodPayslipSource,
        locked: true,
        totals: this.summarize(payslips),
        payslips,
      };
    }

    const live = await this.computeLive(companyId, period.periodId);
    return {
      period: {
        id: live.period.periodId,
        label: live.period.label,
        year: live.period.year,
        month: live.period.month,
        startDate: live.period.startDate,
        endDate: live.period.endDate,
        payDate: live.period.payDate,
        workingDays: live.period.workingDays,
        cycle: "monthly" as const,
        paymentDay: 28,
      },
      runStatus,
      source: "live" as PeriodPayslipSource,
      locked: false,
      totals: live.totals,
      payslips: live.payslips,
    };
  }

  /**
   * Recalculate and persist payslips for a period without advancing workflow.
   * Blocked when the period is already paid.
   */
  async calculate(companyId: string, periodId: string, actorId = "system") {
    let period;
    try {
      period = periodBoundsFor(periodId);
    } catch {
      throw new BadRequestException(`Invalid periodId: ${periodId}`);
    }

    const latest = await this.prisma.payrollRun.findFirst({
      where: { companyId, periodId: period.periodId },
      orderBy: { createdAt: "desc" },
    });
    const currentStatus = normalizeRunStatus(latest?.status);
    if (currentStatus === "paid") {
      throw new BadRequestException(
        "Payroll for this period is already paid and locked"
      );
    }

    const live = await this.computeLive(companyId, period.periodId);

    for (const slip of live.payslips) {
      const payload = {
        ...slip,
        status: "draft",
        generatedAt: new Date().toISOString(),
        netPay: slip.net,
        attendanceDeduction: slip.attendanceDeductions,
      };
      await this.prisma.employeePayslip.upsert({
        where: {
          companyId_employeeId_periodId: {
            companyId,
            employeeId: slip.employeeId,
            periodId: period.periodId,
          },
        },
        create: {
          companyId,
          employeeId: slip.employeeId,
          periodId: period.periodId,
          payload: payload as unknown as Prisma.InputJsonValue,
        },
        update: {
          payload: payload as unknown as Prisma.InputJsonValue,
          version: { increment: 1 },
        },
      });
    }

    const nextStatus =
      currentStatus === "draft" ? "hr_review" : currentStatus;
    const prevPayload = (latest?.payload ?? {}) as Record<string, unknown>;
    const runPayload = {
      id: (prevPayload.id as string) ?? `run_${period.periodId}`,
      companyId,
      periodId: period.periodId,
      status: nextStatus,
      employeeCount: live.totals.employeeCount,
      estimatedCost: live.totals.estimatedCost,
      totalDeductions: live.totals.totalDeductions,
      totalOvertime: live.totals.totalOvertime,
      netPayroll: live.totals.netPayroll,
      averageSalary: live.totals.averageSalary,
      employerCostTotal: live.totals.estimatedCost,
      pendingCount: live.totals.employeeCount,
      createdAt: (prevPayload.createdAt as string) ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: (prevPayload.createdBy as string) ?? actorId,
      updatedBy: actorId,
      deletedAt: null,
      isArchived: false,
      version: Number(prevPayload.version ?? 1) + 1,
      metadata: {
        linkedToAttendance: true,
        recalculated: true,
        previousStatus: currentStatus,
        calculatedOnly: true,
      },
    };

    if (latest) {
      await this.prisma.payrollRun.update({
        where: { id: latest.id },
        data: {
          status: nextStatus,
          payload: runPayload as unknown as Prisma.InputJsonValue,
        },
      });
    } else {
      await this.prisma.payrollRun.create({
        data: {
          companyId,
          periodId: period.periodId,
          status: nextStatus,
          payload: runPayload as unknown as Prisma.InputJsonValue,
        },
      });
    }

    // Re-read via preview so client gets consistent shape.
    return this.preview(companyId, period.periodId);
  }

  /** Lightweight list of periods that already have runs or payslips + current. */
  async listPeriods(companyId: string) {
    const current = periodBoundsFor(
      `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, "0")}`
    );
    const [runs, slips] = await Promise.all([
      this.prisma.payrollRun.findMany({
        where: { companyId },
        select: { periodId: true, status: true },
        orderBy: { periodId: "desc" },
      }),
      this.prisma.employeePayslip.findMany({
        where: { companyId },
        select: { periodId: true },
        distinct: ["periodId"],
      }),
    ]);

    const map = new Map<string, string>();
    map.set(current.periodId, "draft");
    for (const s of slips) map.set(s.periodId, map.get(s.periodId) ?? "draft");
    for (const r of runs) map.set(r.periodId, normalizeRunStatus(r.status));

    // Always expose a 12-month window ending at current for the month picker.
    const window: string[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(Date.UTC(current.year, current.month - 1 - i, 1));
      window.push(
        `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
      );
    }
    for (const id of window) {
      if (!map.has(id)) map.set(id, "draft");
    }

    return [...map.entries()]
      .map(([id, status]) => {
        const bounds = periodBoundsFor(id);
        return {
          ...bounds,
          status,
        };
      })
      .sort((a, b) => b.periodId.localeCompare(a.periodId));
  }
}
