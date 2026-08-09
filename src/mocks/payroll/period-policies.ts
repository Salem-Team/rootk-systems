import type { PayrollPeriod, PayrollPolicies } from "@/types/payroll";
import type { SeedOf } from "@/types/seed";

export const PAYROLL_PERIOD: PayrollPeriod = {
  id: "prd-2026-08",
  label: "August 2026",
  year: 2026,
  month: 8,
  startDate: "2026-08-01",
  endDate: "2026-08-31",
  payDate: "2026-09-01",
  workingDays: 22,
  cycle: "monthly",
  paymentDay: 1,
};

export const payrollPoliciesSeed: SeedOf<PayrollPolicies> = {
  id: "pol-rootk-001",
  late: {
    graceMinutes: 15,
    tiers: [
      { afterMinutes: 15, dayFraction: 0.25 },
      { afterMinutes: 60, dayFraction: 0.5 },
      { afterMinutes: 120, dayFraction: 1 },
    ],
  },
  absenceDayFraction: 1,
  halfDayFraction: 0.5,
  earlyLeaveDayFraction: 0.25,
  missingPunchDayFraction: 0.25,
  overtimeRate: 1.5,
  holidayOvertimeRate: 2.5,
  weekendOvertimeRate: 2,
  nightShiftAllowance: 350,
  minimumWorkingMinutes: 480,
  maxDeductionDayFraction: 1,
  monthlyDeductionCap: 25000,
  autoRounding: "nearest_1",
  currency: "EGP",
  payrollCycle: "monthly",
  paymentDay: 1,
  deductionPriority: [
    "tax",
    "insurance",
    "loan",
    "advance",
    "attendance",
    "leave",
    "recurring",
    "penalty",
  ],
  leaveBehavior: {
    annual: "full_pay",
    sick: "full_pay",
    personal: "partial_pay",
    unpaid: "unpaid",
    maternity: "statutory",
    emergency: "partial_pay",
    compassionate: "full_pay",
    paternity: "full_pay",
    study: "partial_pay",
  },
  leavePayFraction: {
    personal: 0.5,
    emergency: 0.5,
    maternity: 0.75,
    study: 0.5,
  },
};
