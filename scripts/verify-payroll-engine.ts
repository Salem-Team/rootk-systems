/**
 * Payroll engine correctness checks — run with:
 *   node --import tsx scripts/verify-payroll-engine.ts
 */
import { calculateEmployeePayslip } from "../src/lib/payroll/engine";
import type {
  EmployeeSalaryProfile,
  PayrollCalculationInput,
  PayrollPolicies,
  PayrollRule,
} from "../src/types/payroll";

const now = "2026-08-05T12:00:00.000Z";

const basePolicies: PayrollPolicies = {
  id: "pol",
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
  companyId: "cmp",
  createdAt: now,
  updatedAt: now,
  createdBy: "system",
  updatedBy: "system",
  deletedAt: null,
  isArchived: false,
  version: 1,
  metadata: {},
};

const profile: EmployeeSalaryProfile = {
  id: "sal-1",
  employeeId: "emp-001",
  basicSalary: 20000,
  allowances: {
    housing: 2000,
    transportation: 500,
    meal: 300,
    phone: 200,
    other: 0,
    shift: 0,
  },
  bonuses: 0,
  commission: 0,
  incentives: 0,
  manualAdjustments: 0,
  deductions: {
    insurance: 2200,
    tax: 1600,
    loan: 0,
    advances: 0,
    recurring: 150,
    penalties: 0,
  },
  salaryGrade: "G3",
  salaryType: "monthly",
  payrollGroup: "standard",
  currency: "EGP",
  bankAccount: "10020001",
  iban: "EG00",
  paymentMethod: "bank_transfer",
  insuranceStatus: "insured",
  taxStatus: "resident",
  contractType: "full_time",
  joiningDate: "2024-01-01",
  effectiveFrom: "2026-01-01",
  history: [],
  incrementHistory: [],
  companyId: "cmp",
  createdAt: now,
  updatedAt: now,
  createdBy: "system",
  updatedBy: "system",
  deletedAt: null,
  isArchived: false,
  version: 1,
  metadata: {},
};

const emptyRules: PayrollRule[] = [];

function input(
  partial: Partial<PayrollCalculationInput> = {}
): PayrollCalculationInput {
  return {
    profile,
    policies: basePolicies,
    rules: emptyRules,
    period: {
      id: "2026-08",
      label: "2026-08",
      year: 2026,
      month: 8,
      startDate: "2026-08-01",
      endDate: "2026-08-31",
      payDate: "2026-08-28",
      workingDays: 22,
      cycle: "monthly",
      paymentDay: 1,
    },
    schedule: {
      workingDays: ["sunday", "monday", "tuesday", "wednesday", "thursday"],
      weekendDays: ["friday", "saturday"],
      gracePeriodMinutes: 15,
      breakMinutes: 60,
      fromTime: "09:00",
      toTime: "18:00",
      minimumWorkingMinutes: 480,
    },
    attendance: [],
    leaves: [],
    asOfDate: "2026-08-05",
    ...partial,
  };
}

function assert(cond: boolean, message: string) {
  if (!cond) throw new Error(message);
}

function approx(a: number, b: number, tol = 1) {
  return Math.abs(a - b) <= tol;
}

let passed = 0;

// 1) Clean month — gross and statutory deductions only
{
  const slip = calculateEmployeePayslip(input());
  const allow = 2000 + 500 + 300 + 200;
  const expectedGross = 20000 + allow;
  const expectedDed = 2200 + 1600 + 150;
  assert(approx(slip.gross, expectedGross), `gross ${slip.gross} != ${expectedGross}`);
  assert(approx(slip.net, expectedGross - expectedDed), `net ${slip.net}`);
  assert(slip.lines.some((l) => l.code === "BASIC"), "missing BASIC line");
  assert(slip.lines.some((l) => l.code === "INS"), "missing INS line");
  assert(slip.attendanceDeductions === 0, "no attendance deductions expected");
  passed += 1;
  console.log("✓ clean month gross/net/statutory");
}

// 2) One absence day = full daily rate
{
  const allow = 2000 + 500 + 300 + 200;
  const daily = (20000 + allow) / 22;
  const slip = calculateEmployeePayslip(
    input({
      attendance: [
        {
          date: "2026-08-03",
          status: "absent",
          lateMinutes: 0,
          workingMinutes: 0,
          isEarlyLeave: false,
        },
      ],
    })
  );
  assert(
    approx(slip.attendanceDeductions, daily),
    `absence ${slip.attendanceDeductions} != ${daily}`
  );
  assert(
    slip.attendanceImpacts.some((i) => i.kind === "absence"),
    "missing absence impact"
  );
  passed += 1;
  console.log("✓ absence deducts one daily rate");
}

// 3) Late uses tiers WITHOUT double-subtracting grace (minutes already net)
{
  const allow = 2000 + 500 + 300 + 200;
  const daily = (20000 + allow) / 22;
  const slip = calculateEmployeePayslip(
    input({
      attendance: [
        {
          date: "2026-08-03",
          status: "late",
          lateMinutes: 20, // already net of grace
          workingMinutes: 460,
          checkIn: "2026-08-03T09:20:00.000Z",
          checkOut: "2026-08-03T18:00:00.000Z",
          isEarlyLeave: false,
        },
      ],
    })
  );
  // 20 >= 15 → 0.25 day
  assert(
    approx(slip.attendanceDeductions, daily * 0.25),
    `late tier ${slip.attendanceDeductions} != ${daily * 0.25}`
  );
  passed += 1;
  console.log("✓ late tier without double grace");
}

// 4) Unpaid leave deducts daily × days
{
  const allow = 2000 + 500 + 300 + 200;
  const daily = (20000 + allow) / 22;
  const slip = calculateEmployeePayslip(
    input({
      leaves: [
        {
          id: "lv-1",
          type: "unpaid",
          status: "approved",
          startDate: "2026-08-10",
          endDate: "2026-08-11",
          days: 2,
        },
      ],
    })
  );
  assert(
    approx(slip.leaveDeductions, daily * 2),
    `leave ${slip.leaveDeductions} != ${daily * 2}`
  );
  passed += 1;
  console.log("✓ unpaid leave deduction");
}

// 5) Overtime pays hourly × rate × hours
{
  const allow = 2000 + 500 + 300 + 200;
  const daily = (20000 + allow) / 22;
  const hourly = daily / 8;
  const slip = calculateEmployeePayslip(
    input({
      overtimeHours: 4,
      rules: [],
    })
  );
  assert(
    approx(slip.overtimePay, hourly * 1.5 * 4),
    `ot ${slip.overtimePay} != ${hourly * 1.5 * 4}`
  );
  assert(slip.lines.some((l) => l.code === "OT"), "missing OT line");
  passed += 1;
  console.log("✓ overtime pay");
}

// 6) Identity: net = gross - deductionsTotal (rounded)
{
  const slip = calculateEmployeePayslip(
    input({
      attendance: [
        {
          date: "2026-08-03",
          status: "absent",
          lateMinutes: 0,
          workingMinutes: 0,
          isEarlyLeave: false,
        },
      ],
      overtimeHours: 2,
    })
  );
  assert(
    approx(slip.net, slip.gross - slip.deductionsTotal),
    `identity net=${slip.net} gross-ded=${slip.gross - slip.deductionsTotal}`
  );
  assert(slip.employeeCost === slip.deductionsTotal, "employeeCost == deductions");
  passed += 1;
  console.log("✓ net identity");
}

console.log(`\nAll ${passed} payroll engine checks passed.`);
