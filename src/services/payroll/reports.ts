import { AppRole } from "@/constants/roles";
import { isApiMode } from "@/lib/env";
import { fetchPayrollReports } from "@/api/payroll.api";
import { employeeRepository } from "@/repositories";
import { ForbiddenError } from "@/lib/errors";
import { fromError, ok } from "@/services/api-result";
import { simulateDelay } from "@/services/fake-api";
import { getSessionRole } from "@/stores/session-store";
import type { ApiResponse, Department } from "@/types";
import type { DepartmentPayrollRow, PayrollReportBundle } from "@/types/payroll";
import { buildPayslips } from "./calculation";

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
    if (getSessionRole() !== AppRole.admin) {
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
