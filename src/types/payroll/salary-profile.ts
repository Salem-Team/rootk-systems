import type { BaseEntity } from "@/types";
import type {
  ContractType,
  InsuranceStatus,
  PaymentMethod,
  PayrollGroup,
  SalaryGrade,
  SalaryType,
  TaxStatus,
} from "./enums";

export interface SalaryAllowances {
  housing: number;
  transportation: number;
  meal: number;
  phone: number;
  other: number;
  /** Recurring shift / night allowance base (engine may add more). */
  shift: number;
}

export interface SalaryDeductions {
  insurance: number;
  tax: number;
  loan: number;
  advances: number;
  recurring: number;
  penalties: number;
}

export interface SalaryHistoryEntry {
  id: string;
  effectiveFrom: string;
  basicSalary: number;
  note: string;
}

export interface IncrementHistoryEntry {
  id: string;
  effectiveFrom: string;
  previousBasic: number;
  newBasic: number;
  percent: number;
  note: string;
}

export interface EmployeeSalaryProfile extends BaseEntity {
  id: string;
  employeeId: string;
  basicSalary: number;
  allowances: SalaryAllowances;
  bonuses: number;
  commission: number;
  incentives: number;
  manualAdjustments: number;
  deductions: SalaryDeductions;
  salaryGrade: SalaryGrade;
  salaryType: SalaryType;
  payrollGroup: PayrollGroup;
  currency: string;
  bankAccount: string;
  iban: string;
  paymentMethod: PaymentMethod;
  insuranceStatus: InsuranceStatus;
  taxStatus: TaxStatus;
  contractType: ContractType;
  joiningDate: string;
  effectiveFrom: string;
  history: SalaryHistoryEntry[];
  incrementHistory: IncrementHistoryEntry[];
}
