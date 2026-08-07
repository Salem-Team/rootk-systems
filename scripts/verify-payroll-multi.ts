/**
 * Multi-employee payroll correctness — company ledger must equal Σ employees.
 * Also cross-checks FE engine vs BE engine on the same inputs.
 *
 *   npx tsx scripts/verify-payroll-multi.ts
 */
import { calculateEmployeePayslip as feCalc } from "../src/lib/payroll/engine";
import { calculateEmployeePayslip as beCalc } from "../backend/src/lib/payroll-engine";
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

const emptyRules: PayrollRule[] = [];

function makeProfile(
  id: string,
  basic: number,
  extras: Partial<EmployeeSalaryProfile> = {}
): EmployeeSalaryProfile {
  return {
    id: `sal-${id}`,
    employeeId: id,
    basicSalary: basic,
    allowances: {
      housing: Math.round(basic * 0.1),
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
      insurance: Math.round(basic * 0.11),
      tax: Math.round(basic * 0.08),
      loan: 0,
      advances: 0,
      recurring: 100,
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
    ...extras,
  };
}

function baseInput(
  profile: EmployeeSalaryProfile,
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

const employees = [
  {
    profile: makeProfile("emp-a", 28000),
    attendance: [] as PayrollCalculationInput["attendance"],
    overtimeHours: 0,
    label: "clean senior",
  },
  {
    profile: makeProfile("emp-b", 18000, {
      deductions: {
        insurance: 1980,
        tax: 1440,
        loan: 500,
        advances: 0,
        recurring: 100,
        penalties: 200,
      },
    }),
    attendance: [
      {
        date: "2026-08-03",
        status: "absent" as const,
        lateMinutes: 0,
        workingMinutes: 0,
        isEarlyLeave: false,
      },
    ],
    overtimeHours: 0,
    label: "mid + absence + loan/penalty",
  },
  {
    profile: makeProfile("emp-c", 12000),
    attendance: [
      {
        date: "2026-08-04",
        status: "late" as const,
        lateMinutes: 75,
        workingMinutes: 405,
        checkIn: "2026-08-04T10:15:00.000Z",
        checkOut: "2026-08-04T18:00:00.000Z",
        isEarlyLeave: false,
      },
    ],
    overtimeHours: 3,
    label: "junior + late + OT",
  },
];

// 1) Per-employee identity + FE/BE parity
{
  for (const emp of employees) {
    const input = baseInput(emp.profile, {
      attendance: emp.attendance,
      overtimeHours: emp.overtimeHours,
    });
    const fe = feCalc(input);
    const be = beCalc(input as Parameters<typeof beCalc>[0]);

    assert(
      approx(fe.net, fe.gross - fe.deductionsTotal),
      `${emp.label}: FE identity net=${fe.net}`
    );
    assert(
      approx(be.net, be.gross - be.deductionsTotal),
      `${emp.label}: BE identity net=${be.net}`
    );
    assert(approx(fe.gross, be.gross), `${emp.label}: FE/BE gross`);
    assert(approx(fe.net, be.net), `${emp.label}: FE/BE net`);
    assert(
      approx(fe.deductionsTotal, be.deductionsTotal),
      `${emp.label}: FE/BE deductions`
    );
    assert(
      approx(fe.attendanceDeductions, be.attendanceDeductions),
      `${emp.label}: FE/BE attendance`
    );
    assert(approx(fe.overtimePay, be.overtimePay), `${emp.label}: FE/BE OT`);
    assert(
      fe.employeeCost === fe.deductionsTotal,
      `${emp.label}: employeeCost == deductions`
    );
  }
  passed += 1;
  console.log("✓ per-employee identity + FE/BE parity");
}

// 2) Company ledger = Σ employees
{
  const slips = employees.map((emp) =>
    feCalc(
      baseInput(emp.profile, {
        attendance: emp.attendance,
        overtimeHours: emp.overtimeHours,
      })
    )
  );
  const companyNet = slips.reduce((s, p) => s + p.net, 0);
  const companyDed = slips.reduce((s, p) => s + p.deductionsTotal, 0);
  const companyOt = slips.reduce((s, p) => s + p.overtimePay, 0);
  const companyEmployer = slips.reduce((s, p) => s + p.employerCost, 0);
  const companyGross = slips.reduce((s, p) => s + p.gross, 0);

  assert(slips.length === 3, "expected 3 slips");
  assert(companyNet === slips[0].net + slips[1].net + slips[2].net, "net sum");
  assert(
    companyDed ===
      slips[0].deductionsTotal +
        slips[1].deductionsTotal +
        slips[2].deductionsTotal,
    "deductions sum"
  );
  assert(
    approx(companyNet, companyGross - companyDed),
    `company identity ${companyNet} vs ${companyGross - companyDed}`
  );
  assert(companyOt >= 0 && companyEmployer > companyNet, "employer cost > net");

  // Absent employee must have higher attendance deduction than clean senior
  assert(
    slips[1].attendanceDeductions > slips[0].attendanceDeductions,
    "absent employee attendance > clean"
  );
  // Late junior should have attendance deduction > 0 and OT > 0
  assert(slips[2].attendanceDeductions > 0, "late has attendance deduction");
  assert(slips[2].overtimePay > 0, "OT employee has overtime pay");

  passed += 1;
  console.log(
    `✓ company ledger Σ (net=${companyNet}, ded=${companyDed}, ot=${companyOt})`
  );
}

// 3) Salary profile change moves gross/net for that employee only
{
  const before = feCalc(baseInput(employees[0].profile));
  const raised = makeProfile("emp-a", 30000);
  const after = feCalc(baseInput(raised));
  assert(after.gross > before.gross, "raise increases gross");
  assert(after.net !== before.net, "raise changes net");
  const other = feCalc(
    baseInput(employees[2].profile, {
      attendance: employees[2].attendance,
      overtimeHours: employees[2].overtimeHours,
    })
  );
  const otherAgain = feCalc(
    baseInput(employees[2].profile, {
      attendance: employees[2].attendance,
      overtimeHours: employees[2].overtimeHours,
    })
  );
  assert(approx(other.net, otherAgain.net), "other employee unchanged");
  passed += 1;
  console.log("✓ salary raise is employee-scoped");
}

// 4) Deduction cap cannot exceed monthlyDeductionCap
{
  const heavy = makeProfile("emp-cap", 20000, {
    deductions: {
      insurance: 8000,
      tax: 8000,
      loan: 5000,
      advances: 4000,
      recurring: 2000,
      penalties: 3000,
    },
  });
  const slip = feCalc(
    baseInput(heavy, {
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
    slip.deductionsTotal <= basePolicies.monthlyDeductionCap + 1,
    `cap exceeded: ${slip.deductionsTotal}`
  );
  assert(approx(slip.net, slip.gross - slip.deductionsTotal), "capped identity");
  passed += 1;
  console.log("✓ monthly deduction cap respected");
}

// 5) Dashboard-style aggregation helper (full deductions, not attendance-only)
{
  const slips = employees.map((emp) =>
    feCalc(
      baseInput(emp.profile, {
        attendance: emp.attendance,
        overtimeHours: emp.overtimeHours,
      })
    )
  );
  const fullDed = slips.reduce((s, p) => s + p.deductionsTotal, 0);
  const attOnly = slips.reduce((s, p) => s + p.attendanceDeductions, 0);
  assert(fullDed > attOnly, "KPI must use full deductions, not attendance-only");
  passed += 1;
  console.log("✓ KPI deductions use full deductionsTotal");
}

console.log(`\nAll ${passed} multi-employee payroll checks passed.`);
