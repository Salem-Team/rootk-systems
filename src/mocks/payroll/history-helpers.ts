import type { PayslipHistoryItem } from "@/types/payroll";
import { PAYROLL_PERIOD } from "./period-policies";

/** Mock payslip history for employee self-service. */
export function mockPayslipHistory(employeeId: string): PayslipHistoryItem[] {
  const n = employeeId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const base = 18000 + (n % 20) * 800;
  return [
    {
      id: `hist-slip-${employeeId}-05`,
      periodId: "prd-2026-05",
      periodLabel: "May 2026",
      payDate: "2026-06-01",
      net: base - 400,
      gross: base + 5200,
      status: "paid",
    },
    {
      id: `hist-slip-${employeeId}-06`,
      periodId: "prd-2026-06",
      periodLabel: "June 2026",
      payDate: "2026-07-01",
      net: base,
      gross: base + 5400,
      status: "paid",
    },
    {
      id: `hist-slip-${employeeId}-07`,
      periodId: "prd-2026-07",
      periodLabel: "July 2026",
      payDate: "2026-08-01",
      net: base + 350,
      gross: base + 5600,
      status: "paid",
    },
    {
      id: `hist-slip-${employeeId}-08`,
      periodId: PAYROLL_PERIOD.id,
      periodLabel: PAYROLL_PERIOD.label,
      payDate: PAYROLL_PERIOD.payDate,
      net: 0,
      gross: 0,
      status: "hr_review",
    },
  ];
}

/** Deterministic OT mock hours by employee id. */
export function mockOvertimeHours(employeeId: string): {
  regular: number;
  weekend: number;
  holiday: number;
} {
  const n = employeeId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return {
    regular: (n % 5) + 1,
    weekend: n % 3 === 0 ? 2 : 0,
    holiday: n % 7 === 0 ? 1.5 : 0,
  };
}
