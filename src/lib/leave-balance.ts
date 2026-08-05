import type { LeaveRequest } from "@/types";

const DEFAULT_ANNUAL_ENTITLEMENT = 21;

/** Derive leave balance from real requests (not a hash mock). */
export function computeLeaveBalance(
  requests: LeaveRequest[],
  annualEntitlement = DEFAULT_ANNUAL_ENTITLEMENT
): {
  remaining: number;
  used: number;
  pending: number;
} {
  const used = requests
    .filter((r) => r.status === "approved" && r.type === "annual")
    .reduce((sum, r) => sum + r.days, 0);
  const pending = requests
    .filter((r) => r.status === "pending")
    .reduce((sum, r) => sum + r.days, 0);
  return {
    remaining: Math.max(0, annualEntitlement - used),
    used,
    pending,
  };
}
