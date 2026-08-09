import type {
  DeductionPriorityItem,
  PayrollCalculationInput,
  PayrollPolicies,
  PayslipLine,
} from "./payroll-engine-types";
import { roundAmount } from "./payroll-engine-helpers";

/** Builds the itemized payslip line list — pure formatting over already-computed totals. */
export function buildPayslipLines(params: {
  profile: PayrollCalculationInput["profile"];
  shiftAllowance: number;
  overtimePay: number;
  incentives: number;
  manualAdjustments: number;
  applied: Record<DeductionPriorityItem, number>;
  autoRounding: PayrollPolicies["autoRounding"];
}): PayslipLine[] {
  const { profile, shiftAllowance, overtimePay, incentives, manualAdjustments, applied, autoRounding } =
    params;

  return (
    [
      {
        id: "basic",
        code: "BASIC",
        label: "Basic salary",
        category: "earning",
        amount: profile.basicSalary,
      },
      {
        id: "housing",
        code: "HOUSING",
        label: "Housing allowance",
        category: "allowance",
        amount: profile.allowances.housing,
      },
      {
        id: "transport",
        code: "TRANS",
        label: "Transportation",
        category: "allowance",
        amount: profile.allowances.transportation,
      },
      {
        id: "meal",
        code: "MEAL",
        label: "Meal allowance",
        category: "allowance",
        amount: profile.allowances.meal,
      },
      {
        id: "phone",
        code: "PHONE",
        label: "Phone allowance",
        category: "allowance",
        amount: profile.allowances.phone,
      },
      {
        id: "other-allow",
        code: "OTHER",
        label: "Other allowances",
        category: "allowance",
        amount: profile.allowances.other,
      },
      {
        id: "shift",
        code: "SHIFT",
        label: "Shift allowance",
        category: "allowance",
        amount: shiftAllowance,
      },
      {
        id: "bonus",
        code: "BONUS",
        label: "Bonuses",
        category: "bonus",
        amount: profile.bonuses,
      },
      {
        id: "commission",
        code: "COMM",
        label: "Commission",
        category: "bonus",
        amount: profile.commission,
      },
      {
        id: "incentive",
        code: "INC",
        label: "Incentives",
        category: "incentive",
        amount: incentives,
      },
      {
        id: "adj",
        code: "ADJ",
        label: "Manual adjustments",
        category: "adjustment",
        amount: manualAdjustments,
      },
      {
        id: "ot",
        code: "OT",
        label: "Overtime",
        category: "overtime",
        amount: roundAmount(overtimePay, autoRounding),
      },
      {
        id: "att-ded",
        code: "ATT",
        label: "Attendance deductions",
        category: "deduction",
        amount: -roundAmount(applied.attendance, autoRounding),
      },
      {
        id: "leave-ded",
        code: "LEAVE",
        label: "Leave deductions",
        category: "deduction",
        amount: -roundAmount(applied.leave, autoRounding),
      },
      {
        id: "insurance",
        code: "INS",
        label: "Insurance",
        category: "insurance",
        amount: -applied.insurance,
      },
      {
        id: "tax",
        code: "TAX",
        label: "Tax",
        category: "tax",
        amount: -applied.tax,
      },
      {
        id: "loan",
        code: "LOAN",
        label: "Loan",
        category: "loan",
        amount: -applied.loan,
      },
      {
        id: "adv",
        code: "ADV",
        label: "Advances",
        category: "advance",
        amount: -applied.advance,
      },
      {
        id: "recurring",
        code: "REC",
        label: "Recurring deductions",
        category: "deduction",
        amount: -applied.recurring,
      },
      {
        id: "penalty",
        code: "PEN",
        label: "Penalties",
        category: "penalty",
        amount: -applied.penalty,
      },
    ] as PayslipLine[]
  ).filter((l) => l.amount !== 0);
}
