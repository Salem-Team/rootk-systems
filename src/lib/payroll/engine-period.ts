import type { PayrollPolicies, PayrollRule } from "@/types/payroll";
import { applyRuleAmount, matchRule } from "@/lib/payroll/engine-rules";

/**
 * Period-level OT / weekend / holiday rules run once (not per attendance day).
 * Returns the total overtime pay after applying period rules and policy
 * fallbacks on top of whatever overtime pay day rules already produced.
 */
export function computePeriodOvertime(params: {
  periodRules: PayrollRule[];
  policies: PayrollPolicies;
  rate: number;
  hourly: number;
  hoursPerDay: number;
  overtimeHours: number;
  weekendOt: number;
  holidayOt: number;
  overtimePaySoFar: number;
}): number {
  const {
    periodRules,
    policies,
    rate,
    hourly,
    hoursPerDay,
    overtimeHours,
    weekendOt,
    holidayOt,
  } = params;
  let overtimePay = params.overtimePaySoFar;

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

  return overtimePay;
}
