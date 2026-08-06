/**
 * Work deduction policy + charge mapping checks — run with:
 *   npm run verify:deductions
 */
import {
  DEFAULT_DEDUCTION_POLICY,
  deductionPolicyToPayrollPatch,
  payrollToDeductionPolicy,
  sanitizeDeductionPolicy,
} from "../src/lib/work-deduction-policy";
import { calculateEmployeePayslip } from "../src/lib/payroll/engine";
import type {
  EmployeeSalaryProfile,
  PayrollCalculationInput,
  PayrollPolicies,
} from "../src/types/payroll";

const now = "2026-08-05T12:00:00.000Z";

function assert(cond: boolean, message: string) {
  if (!cond) throw new Error(message);
}

function approx(a: number, b: number, tol = 1) {
  return Math.abs(a - b) <= tol;
}

let passed = 0;

// 1) sanitize clamps & sorts late tiers
{
  const clean = sanitizeDeductionPolicy({
    lateTiers: [
      { afterMinutes: 90, charge: { mode: "day_fraction", value: 0.5 } },
      { afterMinutes: 10, charge: { mode: "day_fraction", value: 9 } },
    ],
    absence: { mode: "fixed_amount", value: -50 },
  });
  assert(clean.lateTiers[0].afterMinutes === 10, "tiers sorted asc");
  assert(clean.lateTiers[0].charge.value === 2, "day fraction capped at 2");
  assert(clean.absence.value === 0, "fixed amount floored at 0");
  assert(clean.halfDay.value === 0.5, "defaults fill missing fields");
  passed += 1;
  console.log("✓ sanitize clamps & sorts");
}

// 2) round-trip work policy ↔ payroll patch
{
  const policy = sanitizeDeductionPolicy({
    ...DEFAULT_DEDUCTION_POLICY,
    absence: { mode: "fixed_amount", value: 500 },
    lateTiers: [
      { afterMinutes: 20, charge: { mode: "fixed_amount", value: 100 } },
    ],
  });
  const patch = deductionPolicyToPayrollPatch(policy, 15);
  assert(patch.absenceDayFraction === 0, "fixed absence → fraction 0");
  assert(patch.absenceCharge?.mode === "fixed_amount", "absence charge kept");
  assert(patch.absenceCharge?.value === 500, "absence amount kept");
  assert(patch.late?.tiers?.[0]?.charge?.mode === "fixed_amount", "late charge");
  assert(patch.late?.graceMinutes === 15, "grace synced");

  const back = payrollToDeductionPolicy({
    late: patch.late!,
    absenceDayFraction: patch.absenceDayFraction!,
    halfDayFraction: patch.halfDayFraction!,
    earlyLeaveDayFraction: patch.earlyLeaveDayFraction!,
    missingPunchDayFraction: patch.missingPunchDayFraction!,
    absenceCharge: patch.absenceCharge,
    halfDayCharge: patch.halfDayCharge,
    earlyLeaveCharge: patch.earlyLeaveCharge,
    missingPunchCharge: patch.missingPunchCharge,
  });
  assert(back.absence.mode === "fixed_amount", "round-trip absence mode");
  assert(back.absence.value === 500, "round-trip absence value");
  assert(back.lateTiers[0].charge.value === 100, "round-trip late amount");
  passed += 1;
  console.log("✓ work ↔ payroll round-trip");
}

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

function basePolicies(): PayrollPolicies {
  const patch = deductionPolicyToPayrollPatch(DEFAULT_DEDUCTION_POLICY, 15);
  return {
    id: "pol",
    late: patch.late!,
    absenceDayFraction: patch.absenceDayFraction!,
    halfDayFraction: patch.halfDayFraction!,
    earlyLeaveDayFraction: patch.earlyLeaveDayFraction!,
    missingPunchDayFraction: patch.missingPunchDayFraction!,
    absenceCharge: patch.absenceCharge,
    halfDayCharge: patch.halfDayCharge,
    earlyLeaveCharge: patch.earlyLeaveCharge,
    missingPunchCharge: patch.missingPunchCharge,
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
}

function input(
  partial: Partial<PayrollCalculationInput> = {}
): PayrollCalculationInput {
  return {
    profile,
    policies: basePolicies(),
    rules: [],
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

// 3) fixed-amount absence
{
  const policies = basePolicies();
  policies.absenceCharge = { mode: "fixed_amount", value: 400 };
  policies.absenceDayFraction = 0;
  const slip = calculateEmployeePayslip(
    input({
      policies,
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
    approx(slip.attendanceDeductions, 400),
    `fixed absence ${slip.attendanceDeductions} != 400`
  );
  passed += 1;
  console.log("✓ fixed-amount absence");
}

// 4) fixed-amount late tier
{
  const policies = basePolicies();
  policies.late = {
    graceMinutes: 15,
    tiers: [
      {
        afterMinutes: 15,
        dayFraction: 0,
        charge: { mode: "fixed_amount", value: 150 },
      },
    ],
  };
  const slip = calculateEmployeePayslip(
    input({
      policies,
      attendance: [
        {
          date: "2026-08-03",
          status: "late",
          lateMinutes: 20,
          workingMinutes: 460,
          checkIn: "2026-08-03T09:20:00.000Z",
          checkOut: "2026-08-03T18:00:00.000Z",
          isEarlyLeave: false,
        },
      ],
    })
  );
  assert(
    approx(slip.attendanceDeductions, 150),
    `fixed late ${slip.attendanceDeductions} != 150`
  );
  passed += 1;
  console.log("✓ fixed-amount late tier");
}

// 5) half-day day quantity still works
{
  const allow = 2000 + 500 + 300 + 200;
  const daily = (20000 + allow) / 22;
  const policies = basePolicies();
  policies.halfDayCharge = { mode: "day_fraction", value: 0.5 };
  const slip = calculateEmployeePayslip(
    input({
      policies,
      attendance: [
        {
          date: "2026-08-03",
          status: "half_day",
          lateMinutes: 0,
          workingMinutes: 240,
          isEarlyLeave: false,
        },
      ],
    })
  );
  assert(
    approx(slip.attendanceDeductions, daily * 0.5),
    `half day ${slip.attendanceDeductions} != ${daily * 0.5}`
  );
  passed += 1;
  console.log("✓ half-day day quantity");
}

// 6) missing punch fixed amount
{
  const policies = basePolicies();
  policies.missingPunchCharge = { mode: "fixed_amount", value: 75 };
  policies.missingPunchDayFraction = 0;
  const slip = calculateEmployeePayslip(
    input({
      policies,
      attendance: [
        {
          date: "2026-08-03",
          status: "present",
          lateMinutes: 0,
          workingMinutes: 0,
          isEarlyLeave: false,
        },
      ],
    })
  );
  assert(
    approx(slip.attendanceDeductions, 75),
    `missing punch ${slip.attendanceDeductions} != 75`
  );
  passed += 1;
  console.log("✓ fixed-amount missing punch");
}

console.log(`\nAll ${passed} work-deduction checks passed.`);
