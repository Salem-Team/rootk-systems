import type {
  PayrollCalculationInput,
  PayrollPolicies,
  PayrollRule,
} from "./payroll-engine-types";
import { earlyLeaveFallbackMinutes, resolveEarlyLeaveCap, resolveLateTierCharge } from "./payroll-charge";

/** Pure helpers for the payroll engine — extracted for readability, no behavior change. */

export function roundAmount(
  value: number,
  mode: PayrollPolicies["autoRounding"]
): number {
  switch (mode) {
    case "nearest_1":
      return Math.round(value);
    case "nearest_5":
      return Math.round(value / 5) * 5;
    case "nearest_10":
      return Math.round(value / 10) * 10;
    default:
      return Math.round(value * 100) / 100;
  }
}

export function allowancesTotal(input: PayrollCalculationInput): number {
  const a = input.profile.allowances;
  return (
    a.housing + a.transportation + a.meal + a.phone + a.other + a.shift
  );
}

export function resolveRates(input: PayrollCalculationInput): {
  daily: number;
  hourly: number;
  hoursPerDay: number;
} {
  const base =
    input.profile.basicSalary +
    allowancesTotal(input) +
    input.profile.bonuses +
    input.profile.commission;
  const workingDays = Math.max(input.period.workingDays, 1);
  const minMinutes =
    input.schedule?.minimumWorkingMinutes ??
    input.policies.minimumWorkingMinutes;
  const hoursPerDay = Math.max(minMinutes / 60, 1);

  switch (input.profile.salaryType) {
    case "hourly":
      return {
        hourly: input.profile.basicSalary,
        daily: input.profile.basicSalary * hoursPerDay,
        hoursPerDay,
      };
    case "daily":
      return {
        daily: input.profile.basicSalary,
        hourly: input.profile.basicSalary / hoursPerDay,
        hoursPerDay,
      };
    case "weekly":
      return {
        daily: (input.profile.basicSalary * 4.33) / workingDays,
        hourly: (input.profile.basicSalary * 4.33) / workingDays / hoursPerDay,
        hoursPerDay,
      };
    case "monthly":
    default:
      return {
        daily: base / workingDays,
        hourly: base / workingDays / hoursPerDay,
        hoursPerDay,
      };
  }
}

export function matchRule(
  rule: PayrollRule,
  ctx: {
    lateMinutes: number;
    lateOverGrace: number;
    absent: boolean;
    overtimeHours: number;
    weekendOvertime: number;
    holidayOvertime: number;
    halfDay: boolean;
    earlyLeave: boolean;
    nightShift: boolean;
  }
): boolean {
  if (!rule.enabled) return false;
  const { field, operator, value } = rule.when;
  let actual = 0;
  switch (field) {
    case "late_minutes":
      actual = ctx.lateMinutes;
      break;
    case "late_over_grace":
      actual = ctx.lateOverGrace;
      break;
    case "absent":
      actual = ctx.absent ? 1 : 0;
      break;
    case "overtime_hours":
      actual = ctx.overtimeHours;
      break;
    case "weekend_overtime":
      actual = ctx.weekendOvertime;
      break;
    case "holiday_overtime":
      actual = ctx.holidayOvertime;
      break;
    case "half_day":
      actual = ctx.halfDay ? 1 : 0;
      break;
    case "early_leave":
      actual = ctx.earlyLeave ? 1 : 0;
      break;
    case "night_shift":
      actual = ctx.nightShift ? 1 : 0;
      break;
  }
  switch (operator) {
    case "always":
      return true;
    case "gt":
      return actual > value;
    case "gte":
      return actual >= value;
    case "lt":
      return actual < value;
    case "lte":
      return actual <= value;
    case "eq":
      return actual === value;
    default:
      return false;
  }
}

export function applyRuleAmount(
  rule: PayrollRule,
  rate: number,
  hourly: number,
  hours?: number,
  /** When set, `deduct_minutes` uses actual minutes instead of the rule's fixed amount. */
  actualMinutes?: number,
  hoursPerDay = 8,
  shiftAllowanceAmount?: number
): { dayFraction: number; amount: number; kind: "deduct" | "earn" } {
  const { action, amount } = rule.then;
  switch (action) {
    case "deduct_day_fraction":
      return { dayFraction: amount, amount: rate * amount, kind: "deduct" };
    case "deduct_fixed":
      return { dayFraction: amount / Math.max(rate, 1), amount, kind: "deduct" };
    case "deduct_percent_daily":
      return {
        dayFraction: amount / 100,
        amount: rate * (amount / 100),
        kind: "deduct",
      };
    case "deduct_minutes": {
      const minutes = actualMinutes ?? amount;
      const minutesPerDay = Math.max(hoursPerDay * 60, 1);
      return {
        dayFraction: minutes / minutesPerDay,
        amount: hourly * (minutes / 60),
        kind: "deduct",
      };
    }
    case "pay_overtime_rate":
      return {
        dayFraction: 0,
        amount: (hours ?? 0) * hourly * amount,
        kind: "earn",
      };
    case "add_shift_allowance":
      return {
        dayFraction: 0,
        amount: shiftAllowanceAmount ?? amount,
        kind: "earn",
      };
    case "skip":
    default:
      return { dayFraction: 0, amount: 0, kind: "deduct" };
  }
}

/** Late / early minutes on attendance rows are already net of check-in grace. */
export function minutesDeductionFromPolicy(
  minutes: number,
  policies: PayrollPolicies,
  rate: number,
  hourly: number,
  hoursPerDay: number,
  kind: "late" | "early"
): { dayFraction: number; amount: number; minutes: number; label: string } | null {
  if (minutes <= 0) return null;
  const minutesPerDay = Math.max(hoursPerDay * 60, 1);

  if (kind === "late") {
    const tiers = [...(policies.late.tiers ?? [])].sort(
      (a, b) => b.afterMinutes - a.afterMinutes
    );
    const tier = tiers.find((t) => minutes >= t.afterMinutes);
    if (tier) {
      const hit = resolveLateTierCharge(tier, rate);
      return {
        dayFraction: hit.dayFraction,
        amount: hit.amount,
        minutes,
        label: `late_tier_${tier.afterMinutes}`,
      };
    }
  }

  const byMinutes = {
    dayFraction: minutes / minutesPerDay,
    amount: hourly * (minutes / 60),
    minutes,
    label: kind === "late" ? "late_minutes" : "early_leave_minutes",
  };

  if (kind === "early") {
    const cap = resolveEarlyLeaveCap(policies, rate);
    if (byMinutes.amount > cap.amount) {
      return {
        dayFraction: cap.dayFraction,
        amount: cap.amount,
        minutes,
        label: "early_leave",
      };
    }
  }

  return byMinutes;
}

export { earlyLeaveFallbackMinutes };
