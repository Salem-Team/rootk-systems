/**
 * Payroll calculation output types — payslip lines, impacts, runs, reports.
 * Split out of `payroll-engine-types.ts` to keep files small; re-exported from there.
 */
import type {
  AttendanceImpactKind,
  AttendanceStatus,
  BaseEntity,
  Department,
  LeavePayrollBehavior,
  PayrollLeaveType,
  PayrollRunStatus,
  PayrollTimelineKind,
} from "./payroll-engine-types";
import type {
  EmployeeSalaryProfile,
  PayrollPeriod,
  PayrollPolicies,
  PayrollRule,
  SchedulePayrollContext,
} from "./payroll-engine-types-profile";

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

export interface PayrollRun extends BaseEntity {
  id: string;
  periodId: string;
  status: PayrollRunStatus;
  employeeCount: number;
  estimatedCost: number;
  totalDeductions: number;
  totalOvertime: number;
  netPayroll: number;
  averageSalary: number;
  employerCostTotal: number;
  pendingCount: number;
  generatedAt?: string;
  approvedAt?: string;
  paidAt?: string;
}

export interface PayrollTimelineEvent {
  id: string;
  kind: PayrollTimelineKind;
  title: string;
  description: string;
  at: string;
  amount?: number;
  status?: PayrollRunStatus;
}

export interface PayrollCalendarDay {
  date: string;
  label: string;
  kind: "cutoff" | "review" | "pay" | "holiday" | "normal";
}

export interface PayrollDashboardSummary {
  period: PayrollPeriod;
  run: PayrollRun;
  upcomingPayDate: string;
  employeesIncluded: number;
  pendingPayroll: number;
  estimatedCost: number;
  totalDeductions: number;
  totalOvertime: number;
  netPayroll: number;
  averageSalary: number;
  employeesProcessed: number;
  timeline: PayrollTimelineEvent[];
  calendar: PayrollCalendarDay[];
}

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

export interface PayrollCalculationInput {
  profile: EmployeeSalaryProfile;
  policies: PayrollPolicies;
  rules: PayrollRule[];
  period: PayrollPeriod;
  schedule?: SchedulePayrollContext;
  attendance: {
    date: string;
    status: AttendanceStatus;
    lateMinutes: number;
    workingMinutes: number;
    earlyLeaveMinutes?: number;
    overtimeMinutes?: number;
    checkIn?: string;
    checkOut?: string;
    isEarlyLeave: boolean;
    isNightShift?: boolean;
    isBusinessTrip?: boolean;
  }[];
  leaves: {
    id: string;
    type: PayrollLeaveType;
    status: "pending" | "approved" | "rejected";
    startDate: string;
    endDate: string;
    days: number;
  }[];
  overtimeHours?: number;
  weekendOvertimeHours?: number;
  holidayOvertimeHours?: number;
  /** Open attendance day (YYYY-MM-DD) — missing checkout is not deducted yet. */
  asOfDate?: string;
}
