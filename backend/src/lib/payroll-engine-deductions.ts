import type {
  AttendanceImpactKind,
  DeductionPriorityItem,
  PayrollRule,
} from "./payroll-engine-types";

/** Pure helpers for rule-field/deduction-priority handling — no behavior change. */

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

export function orderDeductions(
  buckets: Record<DeductionPriorityItem, number>,
  priority: DeductionPriorityItem[],
  cap: number
): { total: number; applied: Record<DeductionPriorityItem, number> } {
  const applied = { ...buckets };
  let remaining = cap;
  let total = 0;
  for (const key of priority) {
    const take = Math.min(applied[key] ?? 0, remaining);
    applied[key] = take;
    total += take;
    remaining -= take;
  }
  for (const key of Object.keys(applied) as DeductionPriorityItem[]) {
    if (!priority.includes(key)) {
      const take = Math.min(applied[key], remaining);
      applied[key] = take;
      total += take;
      remaining -= take;
    }
  }
  return { total, applied };
}
