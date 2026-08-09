import type { DeductionPriorityItem, PayrollPolicies } from "@/types/payroll";
import { resolveEarlyLeaveCap, resolveLateTierCharge } from "@/lib/payroll/charge";

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
