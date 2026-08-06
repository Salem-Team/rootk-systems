import type { DeductionCharge, WorkDeductionPolicy } from "@/types/org";
import type { PayrollPolicies } from "@/types/payroll";

export const DEFAULT_DEDUCTION_POLICY: WorkDeductionPolicy = {
  lateTiers: [
    { afterMinutes: 15, charge: { mode: "day_fraction", value: 0.25 } },
    { afterMinutes: 60, charge: { mode: "day_fraction", value: 0.5 } },
    { afterMinutes: 120, charge: { mode: "day_fraction", value: 1 } },
  ],
  absence: { mode: "day_fraction", value: 1 },
  halfDay: { mode: "day_fraction", value: 0.5 },
  earlyLeave: { mode: "day_fraction", value: 0.25 },
  missingPunch: { mode: "day_fraction", value: 0.25 },
};

function clampCharge(charge: DeductionCharge): DeductionCharge {
  const mode = charge.mode === "fixed_amount" ? "fixed_amount" : "day_fraction";
  const raw = Number(charge.value);
  const value = Number.isFinite(raw) ? Math.max(0, raw) : 0;
  if (mode === "day_fraction") {
    return { mode, value: Math.min(2, value) };
  }
  return { mode, value: Math.round(value * 100) / 100 };
}

export function sanitizeDeductionPolicy(
  input?: Partial<WorkDeductionPolicy> | null
): WorkDeductionPolicy {
  const base = input ?? {};
  const lateTiers = (base.lateTiers?.length
    ? base.lateTiers
    : DEFAULT_DEDUCTION_POLICY.lateTiers
  )
    .map((tier) => ({
      afterMinutes: Math.max(0, Math.round(Number(tier.afterMinutes) || 0)),
      charge: clampCharge(
        tier.charge ?? { mode: "day_fraction", value: 0.25 }
      ),
    }))
    .sort((a, b) => a.afterMinutes - b.afterMinutes);

  return {
    lateTiers,
    absence: clampCharge(base.absence ?? DEFAULT_DEDUCTION_POLICY.absence),
    halfDay: clampCharge(base.halfDay ?? DEFAULT_DEDUCTION_POLICY.halfDay),
    earlyLeave: clampCharge(
      base.earlyLeave ?? DEFAULT_DEDUCTION_POLICY.earlyLeave
    ),
    missingPunch: clampCharge(
      base.missingPunch ?? DEFAULT_DEDUCTION_POLICY.missingPunch
    ),
  };
}

/** Map work-policy deductions into payroll policy fields the engine understands. */
export function deductionPolicyToPayrollPatch(
  policy: WorkDeductionPolicy,
  graceMinutes: number
): Partial<PayrollPolicies> {
  const clean = sanitizeDeductionPolicy(policy);
  const fractionOf = (c: DeductionCharge) =>
    c.mode === "day_fraction" ? c.value : 0;
  const asCharge = (c: DeductionCharge): DeductionCharge => ({ ...c });

  return {
    late: {
      graceMinutes: Math.max(0, Math.round(graceMinutes || 0)),
      tiers: clean.lateTiers.map((tier) => ({
        afterMinutes: tier.afterMinutes,
        dayFraction: fractionOf(tier.charge),
        charge: asCharge(tier.charge),
      })),
    },
    absenceDayFraction: fractionOf(clean.absence),
    halfDayFraction: fractionOf(clean.halfDay),
    earlyLeaveDayFraction: fractionOf(clean.earlyLeave),
    missingPunchDayFraction: fractionOf(clean.missingPunch),
    absenceCharge: asCharge(clean.absence),
    halfDayCharge: asCharge(clean.halfDay),
    earlyLeaveCharge: asCharge(clean.earlyLeave),
    missingPunchCharge: asCharge(clean.missingPunch),
  };
}

export function payrollToDeductionPolicy(
  policies: Pick<
    PayrollPolicies,
    | "late"
    | "absenceDayFraction"
    | "halfDayFraction"
    | "earlyLeaveDayFraction"
    | "missingPunchDayFraction"
  > &
    Partial<
      Pick<
        PayrollPolicies,
        | "absenceCharge"
        | "halfDayCharge"
        | "earlyLeaveCharge"
        | "missingPunchCharge"
      >
    >
): WorkDeductionPolicy {
  return sanitizeDeductionPolicy({
    lateTiers: (policies.late?.tiers ?? []).map((tier) => ({
      afterMinutes: tier.afterMinutes,
      charge:
        tier.charge ??
        ({
          mode: "day_fraction",
          value: tier.dayFraction,
        } satisfies DeductionCharge),
    })),
    absence:
      policies.absenceCharge ??
      ({
        mode: "day_fraction",
        value: policies.absenceDayFraction,
      } satisfies DeductionCharge),
    halfDay:
      policies.halfDayCharge ??
      ({
        mode: "day_fraction",
        value: policies.halfDayFraction,
      } satisfies DeductionCharge),
    earlyLeave:
      policies.earlyLeaveCharge ??
      ({
        mode: "day_fraction",
        value: policies.earlyLeaveDayFraction,
      } satisfies DeductionCharge),
    missingPunch:
      policies.missingPunchCharge ??
      ({
        mode: "day_fraction",
        value: policies.missingPunchDayFraction,
      } satisfies DeductionCharge),
  });
}
