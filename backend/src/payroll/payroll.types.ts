import type { mergePolicy } from "../lib/payroll-defaults";

/** Merged payroll policy payload (defaults + company overrides). */
export type PolicyPayload = ReturnType<typeof mergePolicy>;

export type SalaryPayload = {
  basicSalary: number;
  allowances?: {
    housing?: number;
    transportation?: number;
    meal?: number;
    phone?: number;
    other?: number;
    shift?: number;
  };
  bonuses?: number;
  commission?: number;
  incentives?: number;
  manualAdjustments?: number;
  deductions?: {
    insurance?: number;
    tax?: number;
    loan?: number;
    advances?: number;
    recurring?: number;
    penalties?: number;
  };
  currency?: string;
  salaryType?: string;
  salaryGrade?: string;
  payrollGroup?: string;
  paymentMethod?: string;
  insuranceStatus?: string;
  taxStatus?: string;
  contractType?: string;
  bankAccount?: string;
  iban?: string;
  joiningDate?: string;
  effectiveFrom?: string;
  [key: string]: unknown;
};
