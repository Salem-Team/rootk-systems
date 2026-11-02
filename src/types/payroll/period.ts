import type { EmployeePayslip } from "./payslip";
import type { PayrollRunStatus } from "./enums";
import type { PayrollPeriod } from "./policies";

export type PayrollPeriodSource = "live" | "stored";

export interface PayrollPeriodTotals {
  employeeCount: number;
  grossTotal: number;
  netPayroll: number;
  totalDeductions: number;
  totalOvertime: number;
  estimatedCost: number;
  averageSalary: number;
}

export interface PayrollPeriodPayslip extends EmployeePayslip {
  employeeName?: string;
  employeeCode?: string;
  department?: string;
  position?: string;
}

export interface PayrollPeriodPreview {
  period: PayrollPeriod;
  runStatus: PayrollRunStatus;
  source: PayrollPeriodSource;
  locked: boolean;
  totals: PayrollPeriodTotals;
  payslips: PayrollPeriodPayslip[];
}

export interface PayrollPeriodListItem {
  periodId: string;
  status: PayrollRunStatus;
  year: number;
  month: number;
  startDate: string;
  endDate: string;
  payDate: string;
  workingDays: number;
  label: string;
}
