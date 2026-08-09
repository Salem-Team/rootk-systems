import type {
  AttendanceImpactKind,
  PayrollRule,
} from "@/types/payroll";

export type RuleMatchContext = {
  lateMinutes: number;
  lateOverGrace: number;
  absent: boolean;
  overtimeHours: number;
  weekendOvertime: number;
  holidayOvertime: number;
  halfDay: boolean;
  earlyLeave: boolean;
  nightShift: boolean;
};

export function matchRule(rule: PayrollRule, ctx: RuleMatchContext): boolean {
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

export const BUILTIN_DAY_RULE_FIELDS = new Set([
  "late_minutes",
  "late_over_grace",
  "absent",
  "half_day",
  "early_leave",
]);

export function enabledBuiltinFields(rules: PayrollRule[]): Set<string> {
  const fields = new Set<string>();
  for (const rule of rules) {
    if (rule.enabled && BUILTIN_DAY_RULE_FIELDS.has(rule.when.field)) {
      fields.add(rule.when.field);
    }
  }
  return fields;
}

export function impactKindForRuleField(field: string): AttendanceImpactKind {
  switch (field) {
    case "absent":
      return "absence";
    case "half_day":
      return "half_day";
    case "early_leave":
      return "early_leave";
    case "night_shift":
      return "night_shift";
    case "late_minutes":
    case "late_over_grace":
    default:
      return "late";
  }
}
