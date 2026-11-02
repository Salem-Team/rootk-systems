import type { PayslipHistoryItem } from "@/types/payroll";
import { PAYROLL_PERIOD } from "./period-policies";

/** Mock payslip history for employee self-service + admin salary tab. */
export function mockPayslipHistory(employeeId: string): PayslipHistoryItem[] {
  const n = employeeId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const base = 18000 + (n % 20) * 800;
  const currency = "EGP";

  const months: Array<{
    suffix: string;
    periodId: string;
    periodLabel: string;
    payDate: string;
    netOffset: number;
    grossExtra: number;
    deductions: number;
    ot: number;
    allowances: number;
    bonuses: number;
    status: PayslipHistoryItem["status"];
  }> = [
    {
      suffix: "05",
      periodId: "2026-05",
      periodLabel: "May 2026",
      payDate: "2026-05-28",
      netOffset: -900,
      grossExtra: 4800,
      deductions: 2100,
      ot: 320,
      allowances: 2800,
      bonuses: 0,
      status: "paid",
    },
    {
      suffix: "06",
      periodId: "2026-06",
      periodLabel: "June 2026",
      payDate: "2026-06-28",
      netOffset: -200,
      grossExtra: 5200,
      deductions: 1850,
      ot: 480,
      allowances: 2800,
      bonuses: 200,
      status: "paid",
    },
    {
      suffix: "07",
      periodId: "2026-07",
      periodLabel: "July 2026",
      payDate: "2026-07-28",
      netOffset: 450,
      grossExtra: 5600,
      deductions: 1720,
      ot: 610,
      allowances: 3000,
      bonuses: 500,
      status: "paid",
    },
    {
      suffix: "08",
      periodId: PAYROLL_PERIOD.id,
      periodLabel: PAYROLL_PERIOD.label,
      payDate: PAYROLL_PERIOD.payDate,
      netOffset: 0,
      grossExtra: 5400,
      deductions: 1600,
      ot: 400,
      allowances: 3000,
      bonuses: 0,
      status: "hr_review",
    },
  ];

  return months.map((m) => {
    const gross = base + m.grossExtra;
    const net = Math.max(0, base + m.netOffset);
    return {
      id: `hist-slip-${employeeId}-${m.suffix}`,
      periodId: m.periodId,
      periodLabel: m.periodLabel,
      payDate: m.payDate,
      net,
      gross,
      status: m.status,
      deductionsTotal: m.deductions,
      overtimePay: m.ot,
      allowancesTotal: m.allowances,
      bonusesTotal: m.bonuses,
      currency,
    };
  });
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
