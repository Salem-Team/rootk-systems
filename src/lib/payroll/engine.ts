import type {
  EmployeePayslip,
  PayrollCalculationInput,
  DeductionPriorityItem,
} from "@/types/payroll";
import { allowancesTotal, resolveRates, roundAmount } from "@/lib/payroll/engine-rates";
import { computeAttendanceImpacts } from "@/lib/payroll/engine-attendance";
import { computePeriodOvertime } from "@/lib/payroll/engine-period";
import { computeLeaveImpacts } from "@/lib/payroll/engine-leave";
import { orderDeductions } from "@/lib/payroll/engine-deductions";
import { buildPayslipLines } from "@/lib/payroll/engine-lines";

const PERIOD_RULE_FIELDS = new Set([
  "overtime_hours",
  "weekend_overtime",
  "holiday_overtime",
]);

/** Pure payroll engine — no UI, no IO. NestJS-portable. */
export function calculateEmployeePayslip(
  input: PayrollCalculationInput
): EmployeePayslip {
  const { daily: rate, hourly, hoursPerDay } = resolveRates(input);
  const policies = input.policies;
  const rules = [...input.rules].sort((a, b) => a.priority - b.priority);

  const overtimeHours = input.overtimeHours ?? 0;
  const weekendOt = input.weekendOvertimeHours ?? 0;
  const holidayOt = input.holidayOvertimeHours ?? 0;

  const dayRules = rules.filter((r) => !PERIOD_RULE_FIELDS.has(r.when.field));
  const periodRules = rules.filter((r) => PERIOD_RULE_FIELDS.has(r.when.field));

  const {
    attendanceDeduction: attendanceDeductionRaw,
    attendanceImpacts,
    overtimePay: overtimePayFromDayRules,
    shiftAllowance,
  } = computeAttendanceImpacts({
    input,
    rate,
    hourly,
    hoursPerDay,
    policies,
    dayRules,
  });

  const overtimePay = computePeriodOvertime({
    periodRules,
    policies,
    rate,
    hourly,
    hoursPerDay,
    overtimeHours,
    weekendOt,
    holidayOt,
    overtimePaySoFar: overtimePayFromDayRules,
  });

  const maxAtt =
    policies.maxDeductionDayFraction * input.period.workingDays * rate;
  const attendanceDeduction = Math.min(attendanceDeductionRaw, maxAtt);

  const { leaveDeduction, leaveImpacts } = computeLeaveImpacts(
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
    input,
    shiftAllowance,
    overtimePay,
    applied,
    policies,
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
