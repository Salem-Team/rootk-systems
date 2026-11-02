import type {
  DayOfWeek,
  PayrollCalculationInput,
  PayrollPolicies,
  PayrollRule,
} from "./payroll-engine-types";
import { earlyLeaveFallbackMinutes, resolveEarlyLeaveCap, resolveLateTierCharge } from "./payroll-charge";

/** Pure helpers for the payroll engine — extracted for readability, no behavior change. */

/** Employees on this contracted basic salary do not receive overtime pay. */
export const OVERTIME_EXEMPT_BASIC_SALARY = 5000;

export function isOvertimeExemptBasic(basicSalary: number): boolean {
  return Math.round(basicSalary) === OVERTIME_EXEMPT_BASIC_SALARY;
}

const WEEK_DAYS: DayOfWeek[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function dayOfWeekFromDateKey(dateKey: string): DayOfWeek {
  const [y, m, d] = dateKey.split("-").map(Number);
  return WEEK_DAYS[new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1)).getUTCDay()];
}

function countWorkingDaysInRange(
  start: string,
  end: string,
  workingDays: DayOfWeek[],
  holidayDates: Set<string>
): number {
  let count = 0;
  const cursor = new Date(`${start}T00:00:00.000Z`);
  const last = new Date(`${end}T00:00:00.000Z`);
  while (cursor <= last) {
    const key = cursor.toISOString().slice(0, 10);
    const dow = dayOfWeekFromDateKey(key);
    if (workingDays.includes(dow) && !holidayDates.has(key)) count += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

/**
 * Mid-month join / exit factor for monthly salary.
 * Daily/hourly rates stay on full contract salary; only payable basic+fixed allowances scale.
 */
export function resolveJoinMonthFactor(input: PayrollCalculationInput): {
  factor: number;
  eligibleDays: number;
  monthDays: number;
} {
  const monthDays = Math.max(input.period.workingDays, 1);
  const join = String(input.profile.joiningDate ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(join)) {
    return { factor: 1, eligibleDays: monthDays, monthDays };
  }
  if (join <= input.period.startDate) {
    return { factor: 1, eligibleDays: monthDays, monthDays };
  }
  if (join > input.period.endDate) {
    return { factor: 0, eligibleDays: 0, monthDays };
  }

  const workingDays =
    input.schedule?.workingDays ??
    (["sunday", "monday", "tuesday", "wednesday", "thursday"] as DayOfWeek[]);
  const holidays = new Set(input.holidayDates ?? []);
  const eligibleDays = countWorkingDaysInRange(
    join,
    input.period.endDate,
    workingDays,
    holidays
  );
  const factor = Math.min(1, Math.max(0, eligibleDays / monthDays));
  return { factor, eligibleDays, monthDays };
}

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

/**
 * Late uses clock minutes from shift start. Below grace / first tier → no charge.
 * Early minutes are already net of check-in grace on the attendance row.
 */
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
    const grace = Math.max(0, Number(policies.late.graceMinutes ?? 0));
    if (minutes < grace) return null;
    const tiers = [...(policies.late.tiers ?? [])].sort(
      (a, b) => b.afterMinutes - a.afterMinutes
    );
    const tier = tiers.find((t) => minutes >= t.afterMinutes);
    if (!tier) return null;
    const hit = resolveLateTierCharge(tier, rate);
    return {
      dayFraction: hit.dayFraction,
      amount: hit.amount,
      minutes,
      label: `late_tier_${tier.afterMinutes}`,
    };
  }

  const byMinutes = {
    dayFraction: minutes / minutesPerDay,
    amount: hourly * (minutes / 60),
    minutes,
    label: "early_leave_minutes" as const,
  };

  const cap = resolveEarlyLeaveCap(policies, rate);
  if (byMinutes.amount > cap.amount) {
    return {
      dayFraction: cap.dayFraction,
      amount: cap.amount,
      minutes,
      label: "early_leave",
    };
  }

  return byMinutes;
}

export { earlyLeaveFallbackMinutes };
