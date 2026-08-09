import type {
  AttendanceImpactLine,
  PayrollCalculationInput,
  PayrollPolicies,
} from "./payroll-engine-types";
import { applyRuleAmount, matchRule } from "./payroll-engine-helpers";
import { enabledBuiltinFields } from "./payroll-engine-deductions";
import { computeDayAttendanceImpacts } from "./payroll-engine-attendance-day";

export interface AttendanceAndOvertimeResult {
  attendanceImpacts: AttendanceImpactLine[];
  attendanceDeduction: number;
  overtimePay: number;
  shiftAllowance: number;
}

const isPeriodRuleField = (field: string) =>
  field === "overtime_hours" ||
  field === "weekend_overtime" ||
  field === "holiday_overtime";

/**
 * Computes attendance-driven deductions (late/early/absence/half-day/missing
 * punches), applies custom day rules, and totals period-level overtime pay.
 * Extracted from `calculateEmployeePayslip` — pure, no behavior change.
 */
export function computeAttendanceAndOvertime(
  input: PayrollCalculationInput,
  policies: PayrollPolicies,
  rate: number,
  hourly: number,
  hoursPerDay: number
): AttendanceAndOvertimeResult {
  const rules = [...input.rules].sort((a, b) => a.priority - b.priority);

  const attendanceImpacts: AttendanceImpactLine[] = [];
  let attendanceDeduction = 0;
  let overtimePay = 0;
  let shiftAllowance = input.profile.allowances.shift;

  const overtimeHours = input.overtimeHours ?? 0;
  const weekendOt = input.weekendOvertimeHours ?? 0;
  const holidayOt = input.holidayOvertimeHours ?? 0;

  const dayRules = rules.filter((r) => !isPeriodRuleField(r.when.field));
  const periodRules = rules.filter((r) => isPeriodRuleField(r.when.field));
  const builtinOverride = enabledBuiltinFields(dayRules);
  const overrides = {
    late:
      builtinOverride.has("late_minutes") ||
      builtinOverride.has("late_over_grace"),
    early: builtinOverride.has("early_leave"),
    absent: builtinOverride.has("absent"),
    halfDay: builtinOverride.has("half_day"),
  };

  // Enabled day rules — including builtins when admin turns them on (they override Policies).
  const activeDayRules = dayRules.filter((r) => r.enabled);

  for (const row of input.attendance) {
    const dayResult = computeDayAttendanceImpacts({
      row,
      employeeId: input.profile.employeeId,
      policies,
      rate,
      hourly,
      hoursPerDay,
      asOfDate: input.asOfDate,
      activeDayRules,
      overrides,
    });
    attendanceImpacts.push(...dayResult.impacts);
    attendanceDeduction += dayResult.deduction;
    shiftAllowance += dayResult.shiftAllowanceAdd;
    overtimePay += dayResult.overtimePayAdd;
  }

  // Period-level OT / weekend / holiday rules run once (not per attendance day).
  const periodCtx = {
    lateMinutes: 0,
    lateOverGrace: 0,
    absent: false,
    overtimeHours,
    weekendOvertime: weekendOt,
    holidayOvertime: holidayOt,
    halfDay: false,
    earlyLeave: false,
    nightShift: false,
  };
  for (const rule of periodRules) {
    if (!matchRule(rule, periodCtx)) continue;
    const otHours =
      rule.when.field === "weekend_overtime"
        ? weekendOt
        : rule.when.field === "holiday_overtime"
          ? holidayOt
          : overtimeHours;
    // Admin Policies OT rates are the source of truth when set.
    const rateMul =
      rule.when.field === "weekend_overtime"
        ? policies.weekendOvertimeRate
        : rule.when.field === "holiday_overtime"
          ? policies.holidayOvertimeRate
          : policies.overtimeRate;
    const applied = applyRuleAmount(
      {
        ...rule,
        then: {
          ...rule.then,
          amount: rateMul > 0 ? rateMul : rule.then.amount,
        },
      },
      rate,
      hourly,
      otHours,
      undefined,
      hoursPerDay,
      policies.nightShiftAllowance
    );
    if (applied.kind === "earn" && applied.amount > 0) {
      overtimePay += applied.amount;
    }
  }

  if (overtimePay === 0 && overtimeHours > 0) {
    overtimePay += overtimeHours * hourly * policies.overtimeRate;
  }
  if (weekendOt > 0) {
    // Avoid double-counting if a period rule already paid weekend OT.
    const weekendRuleHit = periodRules.some(
      (r) => r.enabled && r.when.field === "weekend_overtime" && matchRule(r, periodCtx)
    );
    if (!weekendRuleHit) {
      overtimePay += weekendOt * hourly * policies.weekendOvertimeRate;
    }
  }
  if (holidayOt > 0) {
    const holidayRuleHit = periodRules.some(
      (r) => r.enabled && r.when.field === "holiday_overtime" && matchRule(r, periodCtx)
    );
    if (!holidayRuleHit) {
      overtimePay += holidayOt * hourly * policies.holidayOvertimeRate;
    }
  }

  return { attendanceImpacts, attendanceDeduction, overtimePay, shiftAllowance };
}
