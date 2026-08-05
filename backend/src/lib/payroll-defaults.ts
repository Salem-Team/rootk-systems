import type { Prisma } from "@prisma/client";

export const DEFAULT_PAYROLL_POLICY = {
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
  autoRounding: "nearest_1" as const,
  currency: "EGP",
  payrollCycle: "monthly" as const,
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

export type BuiltinPayrollRuleSeed = {
  code: string;
  name: string;
  enabled: boolean;
  priority: number;
  when: {
    field: string;
    operator: string;
    value: number;
  };
  then: {
    action: string;
    amount: number;
  };
  description: string;
};

export const DEFAULT_PAYROLL_RULES: BuiltinPayrollRuleSeed[] = [
  {
    code: "late_grace",
    name: "Late > Grace → deduct minutes",
    enabled: false,
    priority: 5,
    when: { field: "late_over_grace", operator: "gt", value: 0 },
    then: { action: "deduct_minutes", amount: 15 },
    description:
      "Disabled by default — late deductions follow Policies → late tiers.",
  },
  {
    code: "late_30",
    name: "Late > 30 min → half day",
    enabled: false,
    priority: 10,
    when: { field: "late_minutes", operator: "gt", value: 30 },
    then: { action: "deduct_day_fraction", amount: 0.5 },
    description: "Disabled by default — late tiers in Policies are source of truth.",
  },
  {
    code: "absence",
    name: "Absent → full day",
    enabled: false,
    priority: 20,
    when: { field: "absent", operator: "eq", value: 1 },
    then: { action: "deduct_day_fraction", amount: 1 },
    description: "Disabled by default — uses Policies → absence fraction.",
  },
  {
    code: "half_day",
    name: "Half day → 0.5 day",
    enabled: false,
    priority: 25,
    when: { field: "half_day", operator: "eq", value: 1 },
    then: { action: "deduct_day_fraction", amount: 0.5 },
    description: "Disabled by default — uses Policies → half-day fraction.",
  },
  {
    code: "early_leave",
    name: "Early leave → 0.25 day",
    enabled: false,
    priority: 30,
    when: { field: "early_leave", operator: "eq", value: 1 },
    then: { action: "deduct_day_fraction", amount: 0.25 },
    description: "Disabled by default — uses Policies → early-leave fraction.",
  },
  {
    code: "night_shift",
    name: "Night shift → shift allowance",
    enabled: true,
    priority: 35,
    when: { field: "night_shift", operator: "eq", value: 1 },
    then: { action: "add_shift_allowance", amount: 350 },
    description: "IF Night Shift THEN Add Shift Allowance",
  },
  {
    code: "ot_2h",
    name: "Overtime > 2h → 150%",
    enabled: true,
    priority: 40,
    when: { field: "overtime_hours", operator: "gt", value: 2 },
    then: { action: "pay_overtime_rate", amount: 1.5 },
    description: "IF Overtime > 2 Hours THEN Pay 150%",
  },
  {
    code: "weekend_ot",
    name: "Weekend OT → 200%",
    enabled: true,
    priority: 50,
    when: { field: "weekend_overtime", operator: "gt", value: 0 },
    then: { action: "pay_overtime_rate", amount: 2 },
    description: "IF Weekend overtime THEN Pay 200%",
  },
];

export function policyJson(): Prisma.InputJsonValue {
  return DEFAULT_PAYROLL_POLICY as unknown as Prisma.InputJsonValue;
}

export function mergePolicy(
  raw: Record<string, unknown> | null | undefined
): typeof DEFAULT_PAYROLL_POLICY & Record<string, unknown> {
  const src = raw ?? {};
  return {
    ...DEFAULT_PAYROLL_POLICY,
    ...src,
    late: {
      ...DEFAULT_PAYROLL_POLICY.late,
      ...((src.late as object) ?? {}),
      tiers:
        (src.late as { tiers?: typeof DEFAULT_PAYROLL_POLICY.late.tiers })
          ?.tiers ?? DEFAULT_PAYROLL_POLICY.late.tiers,
    },
    deductionPriority:
      (src.deductionPriority as string[]) ??
      DEFAULT_PAYROLL_POLICY.deductionPriority,
    leaveBehavior: {
      ...DEFAULT_PAYROLL_POLICY.leaveBehavior,
      ...((src.leaveBehavior as object) ?? {}),
    },
    leavePayFraction: {
      ...DEFAULT_PAYROLL_POLICY.leavePayFraction,
      ...((src.leavePayFraction as object) ?? {}),
    },
  };
}
