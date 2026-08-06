import type { PayrollPolicies } from "@/types/payroll";

type Charge = { mode: "day_fraction" | "fixed_amount"; value: number };

function resolveCharge(
  charge: Charge | undefined,
  fallbackFraction: number,
  rate: number
): { dayFraction: number; amount: number } {
  if (charge?.mode === "fixed_amount") {
    const amount = Math.max(0, Number(charge.value) || 0);
    return {
      amount,
      dayFraction: rate > 0 ? amount / rate : 0,
    };
  }
  const dayFraction = Math.max(
    0,
    Number(charge?.value ?? fallbackFraction) || 0
  );
  return { dayFraction, amount: rate * dayFraction };
}

export function resolveAbsenceCharge(
  policies: PayrollPolicies,
  rate: number
): { dayFraction: number; amount: number } {
  return resolveCharge(
    policies.absenceCharge,
    policies.absenceDayFraction,
    rate
  );
}

export function resolveHalfDayCharge(
  policies: PayrollPolicies,
  rate: number
): { dayFraction: number; amount: number } {
  return resolveCharge(
    policies.halfDayCharge,
    policies.halfDayFraction,
    rate
  );
}

export function resolveEarlyLeaveCap(
  policies: PayrollPolicies,
  rate: number
): { dayFraction: number; amount: number } {
  return resolveCharge(
    policies.earlyLeaveCharge,
    policies.earlyLeaveDayFraction,
    rate
  );
}

export function resolveMissingPunchCharge(
  policies: PayrollPolicies,
  rate: number
): { dayFraction: number; amount: number } {
  return resolveCharge(
    policies.missingPunchCharge,
    policies.missingPunchDayFraction,
    rate
  );
}

export function resolveLateTierCharge(
  tier: { dayFraction: number; charge?: Charge },
  rate: number
): { dayFraction: number; amount: number } {
  return resolveCharge(tier.charge, tier.dayFraction, rate);
}

/** Minutes used when early leave is flagged but no minute count is stored. */
export function earlyLeaveFallbackMinutes(
  policies: PayrollPolicies,
  hoursPerDay: number
): number {
  const fraction =
    policies.earlyLeaveCharge?.mode === "day_fraction"
      ? policies.earlyLeaveCharge.value
      : policies.earlyLeaveDayFraction > 0
        ? policies.earlyLeaveDayFraction
        : 0.25;
  return Math.round(hoursPerDay * 60 * Math.max(fraction, 0.05));
}
