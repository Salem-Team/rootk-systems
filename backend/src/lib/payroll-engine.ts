import type {
  DeductionPriorityItem,
  EmployeePayslip,
  PayrollCalculationInput,
} from "./payroll-engine-types";
import { computeAttendanceAndOvertime } from "./payroll-engine-attendance";
import { computeLeaveImpacts } from "./payroll-engine-leave";
import {
  allowancesTotal,
  resolveRates,
  roundAmount,
} from "./payroll-engine-helpers";
import { orderDeductions } from "./payroll-engine-deductions";
import { buildPayslipLines } from "./payroll-engine-lines";

/** Pure payroll engine — no UI, no IO. NestJS-portable. */
export function calculateEmployeePayslip(
  input: PayrollCalculationInput
): EmployeePayslip {
  const { daily: rate, hourly, hoursPerDay } = resolveRates(input);
  const policies = input.policies;

  const {
    attendanceImpacts,
    attendanceDeduction: rawAttendanceDeduction,
    overtimePay,
    shiftAllowance,
  } = computeAttendanceAndOvertime(input, policies, rate, hourly, hoursPerDay);

  const maxAtt =
    policies.maxDeductionDayFraction * input.period.workingDays * rate;
  const attendanceDeduction = Math.min(rawAttendanceDeduction, maxAtt);

  const { leaveImpacts, leaveDeduction } = computeLeaveImpacts(
    input,
    policies,
    rate
  );

  const allowTotal =
    allowancesTotal(input) - input.profile.allowances.shift + shiftAllowance;
  const bonusesTotal = input.profile.bonuses + input.profile.commission;
  const incentives = input.profile.incentives;
  const manualAdjustments = input.profile.manualAdjustments;

  const gross =
    input.profile.basicSalary +
    allowTotal +
    bonusesTotal +
    incentives +
    manualAdjustments +
    overtimePay;

  const buckets: Record<DeductionPriorityItem, number> = {
    attendance: attendanceDeduction,
    leave: leaveDeduction,
    loan: input.profile.deductions.loan,
    advance: input.profile.deductions.advances,
    insurance: input.profile.deductions.insurance,
    tax: input.profile.deductions.tax,
    recurring: input.profile.deductions.recurring,
    penalty: input.profile.deductions.penalties,
  };

  const { total: deductionsTotal, applied } = orderDeductions(
    buckets,
    policies.deductionPriority,
    policies.monthlyDeductionCap
  );

  const net = roundAmount(gross - deductionsTotal, policies.autoRounding);
  const employeeCost = roundAmount(deductionsTotal, policies.autoRounding);
  const employerContribution = roundAmount(
    input.profile.basicSalary * 0.15 + input.profile.deductions.insurance * 0.5,
    policies.autoRounding
  );
  const employerCost = roundAmount(net + employerContribution, policies.autoRounding);

  const lines = buildPayslipLines({
    profile: input.profile,
    shiftAllowance,
    overtimePay,
    incentives,
    manualAdjustments,
    applied,
    autoRounding: policies.autoRounding,
  });

  return {
    id: `payslip-${input.profile.employeeId}-${input.period.id}`,
    employeeId: input.profile.employeeId,
    periodId: input.period.id,
    currency: input.profile.currency || policies.currency,
    gross: roundAmount(gross, policies.autoRounding),
    allowancesTotal: roundAmount(allowTotal, policies.autoRounding),
    bonusesTotal,
    incentives,
    manualAdjustments,
    overtimePay: roundAmount(overtimePay, policies.autoRounding),
    shiftAllowance: roundAmount(shiftAllowance, policies.autoRounding),
    deductionsTotal: employeeCost,
    insurance: applied.insurance,
    tax: applied.tax,
    loans: applied.loan,
    advances: applied.advance,
    penalties: applied.penalty,
    attendanceDeductions: roundAmount(applied.attendance, policies.autoRounding),
    leaveDeductions: roundAmount(applied.leave, policies.autoRounding),
    net,
    employeeCost,
    employerCost,
    lines,
    attendanceImpacts,
    leaveImpacts,
    dailyRate: roundAmount(rate, policies.autoRounding),
    hourlyRate: roundAmount(hourly, policies.autoRounding),
  };
}

export function formatEgp(
  amount: number,
  locale = "en",
  currency = "EGP"
): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-EG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
