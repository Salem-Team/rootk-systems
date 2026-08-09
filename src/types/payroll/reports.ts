import type { Department } from "@/types";

export interface DepartmentPayrollRow {
  department: Department;
  headcount: number;
  gross: number;
  deductions: number;
  overtime: number;
  net: number;
  employerCost: number;
}

export interface PayrollReportBundle {
  departmentRows: DepartmentPayrollRow[];
  deductionAnalysis: { label: string; amount: number }[];
  overtimeCost: number;
  attendanceCost: number;
  leaveCost: number;
  salaryCost: number;
  monthlyComparison: { month: string; net: number; overtime: number }[];
  yearlyComparison: { year: number; net: number }[];
}
