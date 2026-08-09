import type { EmployeeSalaryProfile } from "@/types/payroll";

export type SalaryProfileDraft = {
  basicSalary: number;
  housing: number;
  transportation: number;
  meal: number;
  phone: number;
  other: number;
  shift: number;
  bonuses: number;
  commission: number;
  incentives: number;
  manualAdjustments: number;
  insurance: number;
  tax: number;
  loan: number;
  advances: number;
  recurring: number;
  penalties: number;
  salaryGrade: EmployeeSalaryProfile["salaryGrade"];
  salaryType: EmployeeSalaryProfile["salaryType"];
  payrollGroup: EmployeeSalaryProfile["payrollGroup"];
  currency: string;
  bankAccount: string;
  iban: string;
  paymentMethod: EmployeeSalaryProfile["paymentMethod"];
  insuranceStatus: EmployeeSalaryProfile["insuranceStatus"];
  taxStatus: EmployeeSalaryProfile["taxStatus"];
  contractType: EmployeeSalaryProfile["contractType"];
};

export function salaryProfileFromDraftSource(
  p: EmployeeSalaryProfile
): SalaryProfileDraft {
  return {
    basicSalary: p.basicSalary,
    housing: p.allowances.housing,
    transportation: p.allowances.transportation,
    meal: p.allowances.meal,
    phone: p.allowances.phone,
    other: p.allowances.other,
    shift: p.allowances.shift,
    bonuses: p.bonuses,
    commission: p.commission,
    incentives: p.incentives,
    manualAdjustments: p.manualAdjustments,
    insurance: p.deductions.insurance,
    tax: p.deductions.tax,
    loan: p.deductions.loan,
    advances: p.deductions.advances,
    recurring: p.deductions.recurring,
    penalties: p.deductions.penalties,
    salaryGrade: p.salaryGrade,
    salaryType: p.salaryType,
    payrollGroup: p.payrollGroup,
    currency: p.currency,
    bankAccount: p.bankAccount,
    iban: p.iban,
    paymentMethod: p.paymentMethod,
    insuranceStatus: p.insuranceStatus,
    taxStatus: p.taxStatus,
    contractType: p.contractType,
  };
}

export function blankSalaryProfileDraft(): SalaryProfileDraft {
  return {
    basicSalary: 0,
    housing: 0,
    transportation: 0,
    meal: 0,
    phone: 0,
    other: 0,
    shift: 0,
    bonuses: 0,
    commission: 0,
    incentives: 0,
    manualAdjustments: 0,
    insurance: 0,
    tax: 0,
    loan: 0,
    advances: 0,
    recurring: 0,
    penalties: 0,
    salaryGrade: "G3",
    salaryType: "monthly",
    payrollGroup: "standard",
    currency: "EGP",
    bankAccount: "",
    iban: "",
    paymentMethod: "bank_transfer",
    insuranceStatus: "insured",
    taxStatus: "resident",
    contractType: "full_time",
  };
}
