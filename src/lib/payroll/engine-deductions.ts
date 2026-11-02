import type { DeductionPriorityItem, PayrollPolicies } from "@/types/payroll";
import { resolveEarlyLeaveCap, resolveLateTierCharge } from "@/lib/payroll/charge";

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
