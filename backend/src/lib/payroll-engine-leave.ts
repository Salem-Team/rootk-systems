import type {
  LeaveImpactLine,
  PayrollCalculationInput,
  PayrollPolicies,
} from "./payroll-engine-types";

export interface LeaveImpactResult {
  leaveImpacts: LeaveImpactLine[];
  leaveDeduction: number;
}

/**
 * Computes leave-driven deductions from approved leave requests.
 * Extracted from `calculateEmployeePayslip` — pure, no behavior change.
 */
export function computeLeaveImpacts(
  input: PayrollCalculationInput,
  policies: PayrollPolicies,
  rate: number
): LeaveImpactResult {
  const leaveImpacts: LeaveImpactLine[] = [];
  let leaveDeduction = 0;
  for (const leave of input.leaves) {
    if (leave.status !== "approved") continue;
    const behavior =
      policies.leaveBehavior[leave.type] ??
      (leave.type === "unpaid" ? "unpaid" : "full_pay");
    const paidFrac =
      behavior === "full_pay"
        ? 1
        : behavior === "unpaid"
          ? 0
          : (policies.leavePayFraction[leave.type] ?? 0.5);
    const amount = leave.days * (1 - paidFrac) * rate;
    leaveDeduction += amount;
    leaveImpacts.push({
      id: `lv-${leave.id}`,
      employeeId: input.profile.employeeId,
      leaveRequestId: leave.id,
      type: leave.type,
      startDate: leave.startDate,
      endDate: leave.endDate,
      days: leave.days,
      behavior,
      dayFractionPaid: paidFrac,
      amount,
      label: `${leave.type} leave`,
    });
  }
  return { leaveImpacts, leaveDeduction };
}
