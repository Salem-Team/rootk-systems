import type { AttendanceStatus } from "@/types";
import type {
  AttendanceImpactKind,
  LeavePayrollBehavior,
  PayrollLeaveType,
  PayrollRunStatus,
} from "./enums";

export interface AttendanceImpactLine {
  id: string;
  employeeId: string;
  date: string;
  kind: AttendanceImpactKind;
  attendanceStatus?: AttendanceStatus;
  minutes?: number;
  dayFraction: number;
  amount: number;
  ruleId?: string;
  label: string;
}

export interface LeaveImpactLine {
  id: string;
  employeeId: string;
  leaveRequestId: string;
  type: PayrollLeaveType;
  startDate: string;
  endDate: string;
  days: number;
  behavior: LeavePayrollBehavior;
  dayFractionPaid: number;
  amount: number;
  label: string;
}

export interface PayslipLine {
  id: string;
  code: string;
  label: string;
  category:
    | "earning"
    | "allowance"
    | "bonus"
    | "overtime"
    | "incentive"
    | "adjustment"
    | "deduction"
    | "tax"
    | "insurance"
    | "loan"
    | "advance"
    | "penalty";
  amount: number;
}

export interface EmployeePayslip {
  id: string;
  employeeId: string;
  periodId: string;
  currency: string;
  gross: number;
  allowancesTotal: number;
  bonusesTotal: number;
  incentives: number;
  manualAdjustments: number;
  overtimePay: number;
  shiftAllowance: number;
  deductionsTotal: number;
  insurance: number;
  tax: number;
  loans: number;
  advances: number;
  penalties: number;
  attendanceDeductions: number;
  leaveDeductions: number;
  /** Take-home pay */
  net: number;
  /** Employee-borne cost (deductions) */
  employeeCost: number;
  /** Employer burden (net + employer contributions mock) */
  employerCost: number;
  lines: PayslipLine[];
  attendanceImpacts: AttendanceImpactLine[];
  leaveImpacts: LeaveImpactLine[];
  dailyRate: number;
  hourlyRate: number;
}

export interface PayslipHistoryItem {
  id: string;
  periodId: string;
  periodLabel: string;
  payDate: string;
  net: number;
  gross: number;
  status: PayrollRunStatus;
}
