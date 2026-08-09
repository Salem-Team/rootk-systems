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
}
