import type {
  DeductionPriorityItem,
  PayrollCalculationInput,
  PayrollPolicies,
  PayslipLine,
} from "@/types/payroll";
import { roundAmount } from "@/lib/payroll/engine-rates";

export function buildPayslipLines(params: {
  input: PayrollCalculationInput;
  shiftAllowance: number;
  overtimePay: number;
  applied: Record<DeductionPriorityItem, number>;
  policies: PayrollPolicies;
}): PayslipLine[] {
  const { input, shiftAllowance, overtimePay, applied, policies } = params;
  const incentives = input.profile.incentives;
  const manualAdjustments = input.profile.manualAdjustments;

  return (
    [
      {
        id: "basic",
        code: "BASIC",
        label: "Basic salary",
        category: "earning",
        amount: input.profile.basicSalary,
      },
      {
        id: "housing",
        code: "HOUSING",
        label: "Housing allowance",
        category: "allowance",
        amount: input.profile.allowances.housing,
      },
      {
        id: "transport",
        code: "TRANS",
        label: "Transportation",
        category: "allowance",
        amount: input.profile.allowances.transportation,
      },
      {
        id: "meal",
        code: "MEAL",
        label: "Meal allowance",
        category: "allowance",
        amount: input.profile.allowances.meal,
      },
      {
        id: "phone",
        code: "PHONE",
        label: "Phone allowance",
        category: "allowance",
        amount: input.profile.allowances.phone,
      },
      {
        id: "other-allow",
        code: "OTHER",
        label: "Other allowances",
        category: "allowance",
        amount: input.profile.allowances.other,
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
        amount: input.profile.bonuses,
      },
      {
        id: "commission",
        code: "COMM",
        label: "Commission",
        category: "bonus",
        amount: input.profile.commission,
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
        amount: roundAmount(overtimePay, policies.autoRounding),
      },
      {
        id: "att-ded",
        code: "ATT",
        label: "Attendance deductions",
        category: "deduction",
        amount: -roundAmount(applied.attendance, policies.autoRounding),
      },
      {
        id: "leave-ded",
        code: "LEAVE",
        label: "Leave deductions",
        category: "deduction",
        amount: -roundAmount(applied.leave, policies.autoRounding),
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
