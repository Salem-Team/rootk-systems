import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  normalizeRunStatus,
  periodBounds,
  roundMoney,
  slipDeductionsTotal,
} from "../payroll.helpers";

/** Payroll KPI dashboard + department/cost reports for the current period. */
@Injectable()
export class PayrollDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(companyId: string) {
    const period = periodBounds();
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
      const p = (s.payload ?? {}) as Record<string, number | undefined>;
      totalDeductions += slipDeductionsTotal(p);
      totalOvertime += Number(p.overtimePay ?? 0);
      netPayroll += Number(p.net ?? p.netPay ?? 0);
      estimatedCost += Number(p.employerCost ?? 0);
    }

    const headcountAll = await this.prisma.employee.count({
      where: {
        companyId,
        deletedAt: null,
        status: { in: ["active", "on_leave"] },
      },
    });

    const runRaw =
      (latestRun?.payload as Record<string, unknown>) ??
      ({
        id: `run_${period.periodId}`,
        companyId,
        periodId: period.periodId,
        status: slips.length ? "hr_review" : "draft",
        employeeCount: headcountAll,
        estimatedCost,
        totalDeductions,
        totalOvertime,
        netPayroll,
        averageSalary: headcountAll ? Math.round(netPayroll / headcountAll) : 0,
        employerCostTotal: estimatedCost,
        pendingCount: Math.max(0, headcountAll - slips.length),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: "system",
        updatedBy: "system",
        deletedAt: null,
        isArchived: false,
        version: 1,
        metadata: {},
      } as Record<string, unknown>);

    const run = {
      ...runRaw,
      status: normalizeRunStatus(
        String(latestRun?.status ?? runRaw.status ?? "draft")
      ),
      // Live slip aggregates so KPI matches per-employee payslips.
      estimatedCost: roundMoney(estimatedCost),
      totalDeductions: roundMoney(totalDeductions),
      totalOvertime: roundMoney(totalOvertime),
      netPayroll: roundMoney(netPayroll),
      employeeCount: Number(runRaw.employeeCount ?? headcountAll),
      averageSalary:
        slips.length > 0
          ? roundMoney(netPayroll / slips.length)
          : Number(runRaw.averageSalary ?? 0),
    };

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
      employeesIncluded: headcountAll,
      pendingPayroll: Math.max(0, headcountAll - slips.length),
      estimatedCost: run.estimatedCost,
      totalDeductions: run.totalDeductions,
      totalOvertime: run.totalOvertime,
      netPayroll: run.netPayroll,
      averageSalary: run.averageSalary,
      employeesProcessed: slips.length,
      timeline: [],
      calendar: [],
    };
  }

  async reports(companyId: string) {
    const period = periodBounds();
    const [slips, employees, allSlips, runs] = await Promise.all([
      this.prisma.employeePayslip.findMany({
        where: { companyId, periodId: period.periodId },
      }),
      this.prisma.employee.findMany({
        where: { companyId, deletedAt: null },
      }),
      this.prisma.employeePayslip.findMany({
        where: { companyId },
        select: { periodId: true, payload: true },
      }),
      this.prisma.payrollRun.findMany({
        where: { companyId },
        select: { periodId: true, payload: true, status: true },
        orderBy: { periodId: "asc" },
      }),
    ]);

    type DeptBucket = {
      headcount: number;
      gross: number;
      deductions: number;
      overtime: number;
      net: number;
      employerCost: number;
    };
    const byDept = new Map<string, DeptBucket>();
    let overtimeCost = 0;
    let attendanceCost = 0;
    let leaveCost = 0;
    let insuranceCost = 0;
    let taxCost = 0;
    let loanCost = 0;
    let advanceCost = 0;
    let penaltyCost = 0;
    let salaryCost = 0;

    for (const slip of slips) {
      const emp = employees.find((e) => e.id === slip.employeeId);
      const dept = emp?.department ?? "Other";
      const p = (slip.payload ?? {}) as Record<string, number | undefined>;
      const net = Number(p.net ?? p.netPay ?? 0);
      const gross = Number(p.gross ?? 0);
      const overtime = Number(p.overtimePay ?? 0);
      const deductions = slipDeductionsTotal(p);
      const employerCost = Number(p.employerCost ?? net);
      const bucket = byDept.get(dept) ?? {
        headcount: 0,
        gross: 0,
        deductions: 0,
        overtime: 0,
        net: 0,
        employerCost: 0,
      };
      bucket.headcount += 1;
      bucket.gross += gross;
      bucket.deductions += deductions;
      bucket.overtime += overtime;
      bucket.net += net;
      bucket.employerCost += employerCost;
      byDept.set(dept, bucket);

      overtimeCost += overtime;
      attendanceCost += Number(
        p.attendanceDeductions ?? p.attendanceDeduction ?? 0
      );
      leaveCost += Number(p.leaveDeductions ?? 0);
      insuranceCost += Number(p.insurance ?? 0);
      taxCost += Number(p.tax ?? 0);
      loanCost += Number(p.loans ?? p.loan ?? 0);
      advanceCost += Number(p.advances ?? 0);
      penaltyCost += Number(p.penalties ?? 0);
      salaryCost += Number(p.basicSalary ?? 0) || Math.max(0, gross - overtime);
    }

    // Aggregate historical months from slips (prefer) + run payloads.
    const monthMap = new Map<string, { net: number; overtime: number }>();
    for (const row of allSlips) {
      const p = (row.payload ?? {}) as Record<string, number | undefined>;
      const cur = monthMap.get(row.periodId) ?? { net: 0, overtime: 0 };
      cur.net += Number(p.net ?? p.netPay ?? 0);
      cur.overtime += Number(p.overtimePay ?? 0);
      monthMap.set(row.periodId, cur);
    }
    for (const run of runs) {
      if (monthMap.has(run.periodId)) continue;
      const p = (run.payload ?? {}) as Record<string, number | undefined>;
      monthMap.set(run.periodId, {
        net: Number(p.netPayroll ?? 0),
        overtime: Number(p.totalOvertime ?? 0),
      });
    }
    // Always include current period even if empty so the chart axis is stable.
    if (!monthMap.has(period.periodId)) {
      monthMap.set(period.periodId, {
        net: [...byDept.values()].reduce((s, d) => s + d.net, 0),
        overtime: overtimeCost,
      });
    }

    // Last 6 months window ending at current.
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(period.year, period.month - 1 - i, 1));
      months.push(
        `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
      );
    }
    const monthlyComparison = months.map((month) => {
      const v = monthMap.get(month) ?? { net: 0, overtime: 0 };
      return {
        month,
        net: Math.round(v.net),
        overtime: Math.round(v.overtime),
      };
    });

    const yearMap = new Map<number, number>();
    for (const [periodId, v] of monthMap) {
      const y = Number(periodId.slice(0, 4));
      if (!Number.isFinite(y)) continue;
      yearMap.set(y, (yearMap.get(y) ?? 0) + v.net);
    }
    const yearlyComparison = [...yearMap.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([year, net]) => ({ year, net: Math.round(net) }));

    const deductionAnalysis = [
      { label: "Attendance", kind: "attendance", amount: Math.round(attendanceCost) },
      { label: "Leave", kind: "leave", amount: Math.round(leaveCost) },
      { label: "Insurance", kind: "insurance", amount: Math.round(insuranceCost) },
      { label: "Tax", kind: "tax", amount: Math.round(taxCost) },
      {
        label: "Loans & advances",
        kind: "loans",
        amount: Math.round(loanCost + advanceCost),
      },
      { label: "Penalties", kind: "penalties", amount: Math.round(penaltyCost) },
    ].filter((d) => d.amount > 0);

    return {
      departmentRows: [...byDept.entries()]
        .map(([department, v]) => ({
          department,
          headcount: v.headcount,
          employees: v.headcount,
          gross: Math.round(v.gross),
          deductions: Math.round(v.deductions),
          overtime: Math.round(v.overtime),
          net: Math.round(v.net),
          employerCost: Math.round(v.employerCost),
        }))
        .sort((a, b) => a.department.localeCompare(b.department)),
      deductionAnalysis,
      overtimeCost: Math.round(overtimeCost),
      attendanceCost: Math.round(attendanceCost),
      leaveCost: Math.round(leaveCost),
      salaryCost: Math.round(salaryCost),
      monthlyComparison,
      yearlyComparison,
    };
  }
}
