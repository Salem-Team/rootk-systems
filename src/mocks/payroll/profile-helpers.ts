import type { EmployeeSalaryProfile } from "@/types/payroll";
import type { SeedOf } from "@/types/seed";

function bankFor(employeeId: string): { bankAccount: string; iban: string } {
  const n = employeeId.replace(/\D/g, "") || "000";
  return {
    bankAccount: `1002${n.padStart(8, "0")}`,
    iban: `EG380002${n.padStart(18, "0")}`,
  };
}

export function profile(
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
