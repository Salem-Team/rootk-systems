import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { slipDeductionsTotal, periodBounds } from "../payroll.helpers";

/** Reads persisted payslips and shapes them for the frontend. */
@Injectable()
export class PayrollPayslipQueryService {
  constructor(private readonly prisma: PrismaService) {}

  /** Normalize stored payslip payload to the frontend EmployeePayslip shape. */
  toClientPayslip(
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
      deductionsTotal: Number(
        p.deductionsTotal ??
          slipDeductionsTotal(p as Record<string, number | undefined>)
      ),
      insurance: Number(p.insurance ?? 0),
      tax: Number(p.tax ?? 0),
      loans: Number(p.loans ?? 0),
      advances: Number(p.advances ?? 0),
      penalties: Number(p.penalties ?? 0),
      attendanceDeductions,
      leaveDeductions: Number(p.leaveDeductions ?? 0),
      net,
      employeeCost: Number(
        p.employeeCost ??
          p.deductionsTotal ??
          slipDeductionsTotal(p as Record<string, number | undefined>)
      ),
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

  async payslips(companyId: string, employeeId?: string) {
    const period = periodBounds();
    const rows = await this.prisma.employeePayslip.findMany({
      where: {
        companyId,
        periodId: period.periodId,
        ...(employeeId ? { employeeId } : {}),
      },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((row) => this.toClientPayslip(row));
  }

  /**
   * Current-period payslip only if a payroll run already persisted one.
   * Never invents/seeds payslips on GET.
   */
  async payslip(companyId: string, employeeId: string) {
    const period = periodBounds();
    const row = await this.prisma.employeePayslip.findUnique({
      where: {
        companyId_employeeId_periodId: {
          companyId,
          employeeId,
          periodId: period.periodId,
        },
      },
    });
    if (!row) return null;
    return this.toClientPayslip(row);
  }

  async history(companyId: string, employeeId: string) {
    const rows = await this.prisma.employeePayslip.findMany({
      where: { companyId, employeeId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => this.toHistoryItem(r));
  }
}
