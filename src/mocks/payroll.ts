import type {
  EmployeeSalaryProfile,
  PayrollCalendarDay,
  PayrollPeriod,
  PayrollPolicies,
  PayrollRule,
  PayrollRun,
  PayrollTimelineEvent,
  PayslipHistoryItem,
} from "@/types/payroll";
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

export const payrollRulesSeed: SeedOf<PayrollRule>[] = [
  {
    id: "rule-late-grace",
    name: "Late > Grace → deduct minutes",
    enabled: false,
    priority: 5,
    when: { field: "late_over_grace", operator: "gt", value: 0 },
    then: { action: "deduct_minutes", amount: 15 },
    description:
      "Disabled by default — late deductions now follow Policies → late tiers.",
  },
  {
    id: "rule-late-30",
    name: "Late > 30 min → half day",
    enabled: false,
    priority: 10,
    when: { field: "late_minutes", operator: "gt", value: 30 },
    then: { action: "deduct_day_fraction", amount: 0.5 },
    description:
      "Disabled by default — late tiers in Policies are the source of truth.",
  },
  {
    id: "rule-absent",
    name: "Absent → full day",
    enabled: false,
    priority: 20,
    when: { field: "absent", operator: "eq", value: 1 },
    then: { action: "deduct_day_fraction", amount: 1 },
    description: "Disabled by default — uses Policies → absence fraction.",
  },
  {
    id: "rule-half",
    name: "Half day → 0.5 day",
    enabled: false,
    priority: 25,
    when: { field: "half_day", operator: "eq", value: 1 },
    then: { action: "deduct_day_fraction", amount: 0.5 },
    description: "Disabled by default — uses Policies → half-day fraction.",
  },
  {
    id: "rule-early",
    name: "Early leave → 0.25 day",
    enabled: false,
    priority: 30,
    when: { field: "early_leave", operator: "eq", value: 1 },
    then: { action: "deduct_day_fraction", amount: 0.25 },
    description: "Disabled by default — uses Policies → early-leave fraction.",
  },
  {
    id: "rule-night",
    name: "Night shift → shift allowance",
    enabled: true,
    priority: 35,
    when: { field: "night_shift", operator: "eq", value: 1 },
    then: { action: "add_shift_allowance", amount: 350 },
    description: "IF Night Shift THEN Add Shift Allowance",
  },
  {
    id: "rule-ot-2",
    name: "Overtime > 2h → 150%",
    enabled: true,
    priority: 40,
    when: { field: "overtime_hours", operator: "gt", value: 2 },
    then: { action: "pay_overtime_rate", amount: 1.5 },
    description: "IF Overtime > 2 Hours THEN Pay 150%",
  },
  {
    id: "rule-weekend-ot",
    name: "Weekend OT → 200%",
    enabled: true,
    priority: 50,
    when: { field: "weekend_overtime", operator: "gt", value: 0 },
    then: { action: "pay_overtime_rate", amount: 2 },
    description: "IF Weekend Overtime THEN Pay 200%",
  },
  {
    id: "rule-holiday-ot",
    name: "Holiday OT → 250%",
    enabled: true,
    priority: 55,
    when: { field: "holiday_overtime", operator: "gt", value: 0 },
    then: { action: "pay_overtime_rate", amount: 2.5 },
    description: "IF Holiday Overtime THEN Pay 250%",
  },
];

function bankFor(employeeId: string): { bankAccount: string; iban: string } {
  const n = employeeId.replace(/\D/g, "") || "000";
  return {
    bankAccount: `1002${n.padStart(8, "0")}`,
    iban: `EG380002${n.padStart(18, "0")}`,
  };
}

function profile(
  employeeId: string,
  basic: number,
  grade: EmployeeSalaryProfile["salaryGrade"],
  extras?: Partial<EmployeeSalaryProfile>
): SeedOf<EmployeeSalaryProfile> {
  const bank = bankFor(employeeId);
  const prev = Math.round(basic * 0.9);
  const {
    allowances: allowanceExtras,
    deductions: deductionExtras,
    bonuses,
    commission,
    incentives,
    manualAdjustments,
    salaryType,
    payrollGroup,
    paymentMethod,
    insuranceStatus,
    taxStatus,
    contractType,
    joiningDate,
    history,
    incrementHistory,
    ...restExtras
  } = extras ?? {};

  return {
    id: `sal-${employeeId}`,
    employeeId,
    basicSalary: basic,
    allowances: {
      housing: Math.round(basic * 0.25),
      transportation: 1200,
      meal: 800,
      phone: 400,
      other: 300,
      shift: 0,
      ...allowanceExtras,
    },
    bonuses: bonuses ?? 0,
    commission: commission ?? 0,
    incentives: incentives ?? 0,
    manualAdjustments: manualAdjustments ?? 0,
    deductions: {
      insurance: Math.round(basic * 0.11),
      tax: Math.round(basic * 0.08),
      loan: 0,
      advances: 0,
      recurring: 150,
      penalties: 0,
      ...deductionExtras,
    },
    salaryGrade: grade,
    salaryType: salaryType ?? "monthly",
    payrollGroup: payrollGroup ?? "standard",
    currency: "EGP",
    bankAccount: bank.bankAccount,
    iban: bank.iban,
    paymentMethod: paymentMethod ?? "bank_transfer",
    insuranceStatus: insuranceStatus ?? "insured",
    taxStatus: taxStatus ?? "resident",
    contractType: contractType ?? "full_time",
    joiningDate: joiningDate ?? "2023-03-01",
    effectiveFrom: "2026-01-01",
    history: history ?? [
      {
        id: `hist-${employeeId}-1`,
        effectiveFrom: "2025-01-01",
        basicSalary: prev,
        note: "Annual review 2025",
      },
      {
        id: `hist-${employeeId}-2`,
        effectiveFrom: "2026-01-01",
        basicSalary: basic,
        note: "Annual review 2026",
      },
    ],
    incrementHistory: incrementHistory ?? [
      {
        id: `inc-${employeeId}-1`,
        effectiveFrom: "2026-01-01",
        previousBasic: prev,
        newBasic: basic,
        percent: Math.round(((basic - prev) / prev) * 1000) / 10,
        note: "Merit increase",
      },
    ],
    ...restExtras,
  };
}

/** Salary profiles for the 16-employee demo roster. */
export const salaryProfilesSeed: SeedOf<EmployeeSalaryProfile>[] = [
  profile("emp-001", 28000, "G5", { bonuses: 1500, incentives: 500 }),
  profile("emp-002", 42000, "G7", {
    bonuses: 3000,
    payrollGroup: "executive",
    joiningDate: "2019-06-15",
  }),
  profile("emp-003", 22000, "G4"),
  profile("emp-004", 25000, "G4", { commission: 2000 }),
  profile("emp-005", 18000, "G3", {
    salaryType: "daily",
    contractType: "part_time",
  }),
  profile("emp-006", 32000, "G6", {
    payrollGroup: "shift",
    allowances: {
      housing: 8000,
      transportation: 1200,
      meal: 800,
      phone: 400,
      other: 300,
      shift: 400,
    },
  }),
  profile("emp-007", 19500, "G3"),
  profile("emp-008", 27000, "G5", {
    deductions: {
      insurance: 2970,
      tax: 2160,
      loan: 2000,
      advances: 500,
      recurring: 150,
      penalties: 200,
    },
    manualAdjustments: 300,
  }),
  profile("emp-009", 21000, "G4"),
  profile("emp-010", 35000, "G6", { bonuses: 2500, incentives: 1000 }),
  profile("emp-011", 16000, "G2", {
    contractType: "intern",
    insuranceStatus: "pending",
  }),
  profile("emp-012", 24000, "G4"),
  profile("emp-013", 30000, "G5", {
    payrollGroup: "shift",
    allowances: {
      housing: 7500,
      transportation: 1200,
      meal: 800,
      phone: 400,
      other: 300,
      shift: 350,
    },
  }),
  profile("emp-014", 17000, "G2"),
  profile("emp-015", 26000, "G5", { commission: 1500 }),
  profile("emp-016", 85, "G3", {
    salaryType: "hourly",
    contractType: "contract",
    payrollGroup: "contract",
  }),
];

export const payrollRunSeed: SeedOf<PayrollRun> = {
  id: "run-2026-08",
  periodId: PAYROLL_PERIOD.id,
  status: "hr_review",
  employeeCount: 16,
  estimatedCost: 0,
  totalDeductions: 0,
  totalOvertime: 0,
  netPayroll: 0,
  averageSalary: 0,
  employerCostTotal: 0,
  pendingCount: 3,
  generatedAt: "2026-08-01T09:00:00+03:00",
};

export const payrollTimelineSeed: PayrollTimelineEvent[] = [
  {
    id: "tl-1",
    kind: "attendance",
    title: "Attendance locked",
    description: "July attendance closed for payroll input.",
    at: "2026-07-31T18:00:00+03:00",
  },
  {
    id: "tl-2",
    kind: "leave",
    title: "Leave sync",
    description: "Approved leave mapped to unpaid/paid fractions.",
    at: "2026-08-01T08:30:00+03:00",
  },
  {
    id: "tl-3",
    kind: "generated",
    title: "Payroll draft generated",
    description: "Engine produced August draft payslips.",
    at: "2026-08-01T09:00:00+03:00",
    status: "draft",
  },
  {
    id: "tl-4",
    kind: "bonus",
    title: "Incentives posted",
    description: "Performance incentives and commissions applied.",
    at: "2026-08-01T16:00:00+03:00",
    amount: 12500,
  },
  {
    id: "tl-5",
    kind: "adjustment",
    title: "HR adjustments",
    description: "Manual adjustments, loans, and penalties applied.",
    at: "2026-08-02T11:00:00+03:00",
    amount: 18500,
  },
  {
    id: "tl-6",
    kind: "approved",
    title: "Awaiting finance",
    description: "Moved to HR review → Finance queue.",
    at: "2026-08-02T14:00:00+03:00",
    status: "hr_review",
  },
  {
    id: "tl-7",
    kind: "paid",
    title: "Pay date",
    description: "Scheduled bank transfer window.",
    at: "2026-09-01T09:00:00+03:00",
    status: "paid",
  },
];

export const payrollCalendarSeed: PayrollCalendarDay[] = [
  { date: "2026-08-01", label: "Cycle start", kind: "normal" },
  { date: "2026-08-25", label: "Cutoff", kind: "cutoff" },
  { date: "2026-08-27", label: "HR review", kind: "review" },
  { date: "2026-08-29", label: "Finance review", kind: "review" },
  { date: "2026-09-01", label: "Pay day", kind: "pay" },
];

/** Mock payslip history for employee self-service. */
export function mockPayslipHistory(employeeId: string): PayslipHistoryItem[] {
  const n = employeeId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const base = 18000 + (n % 20) * 800;
  return [
    {
      id: `hist-slip-${employeeId}-05`,
      periodId: "prd-2026-05",
      periodLabel: "May 2026",
      payDate: "2026-06-01",
      net: base - 400,
      gross: base + 5200,
      status: "paid",
    },
    {
      id: `hist-slip-${employeeId}-06`,
      periodId: "prd-2026-06",
      periodLabel: "June 2026",
      payDate: "2026-07-01",
      net: base,
      gross: base + 5400,
      status: "paid",
    },
    {
      id: `hist-slip-${employeeId}-07`,
      periodId: "prd-2026-07",
      periodLabel: "July 2026",
      payDate: "2026-08-01",
      net: base + 350,
      gross: base + 5600,
      status: "paid",
    },
    {
      id: `hist-slip-${employeeId}-08`,
      periodId: PAYROLL_PERIOD.id,
      periodLabel: PAYROLL_PERIOD.label,
      payDate: PAYROLL_PERIOD.payDate,
      net: 0,
      gross: 0,
      status: "hr_review",
    },
  ];
}

/** Deterministic OT mock hours by employee id. */
export function mockOvertimeHours(employeeId: string): {
  regular: number;
  weekend: number;
  holiday: number;
} {
  const n = employeeId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return {
    regular: (n % 5) + 1,
    weekend: n % 3 === 0 ? 2 : 0,
    holiday: n % 7 === 0 ? 1.5 : 0,
  };
}
