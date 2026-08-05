/**
 * Payroll domain types — NestJS / Prisma-ready shapes.
 * UI must not invent calculation fields; consume engine outputs only.
 */

import type {
  AttendanceStatus,
  BaseEntity,
  DayOfWeek,
  Department,
  LeaveType,
} from "@/types";

export type SalaryType = "monthly" | "weekly" | "daily" | "hourly";
export type SalaryGrade = "G1" | "G2" | "G3" | "G4" | "G5" | "G6" | "G7";
export type PayrollGroup = "standard" | "executive" | "shift" | "contract";
export type PaymentMethod = "bank_transfer" | "cash" | "cheque";
export type InsuranceStatus = "insured" | "exempt" | "pending";
export type TaxStatus = "resident" | "non_resident" | "exempt";
export type ContractType = "full_time" | "part_time" | "contract" | "intern";

export type PayrollLeaveType =
  | LeaveType
  | "compassionate"
  | "paternity"
  | "study";

export type PayrollRunStatus =
  | "draft"
  | "hr_review"
  | "finance_review"
  | "approved"
  | "paid"
  | "cancelled";

export type PayrollPersona = "hr" | "finance" | "manager" | "employee" | "admin";

export type AttendanceImpactKind =
  | "late"
  | "early_leave"
  | "absence"
  | "half_day"
  | "missing_check_in"
  | "missing_check_out"
  | "wfh"
  | "holiday"
  | "weekend"
  | "business_trip"
  | "overtime"
  | "night_shift";

export type LeavePayrollBehavior =
  | "full_pay"
  | "partial_pay"
  | "unpaid"
  | "statutory";

export type PayrollRuleOperator =
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "eq"
  | "always";

export type PayrollRuleAction =
  | "deduct_day_fraction"
  | "deduct_fixed"
  | "deduct_percent_daily"
  | "deduct_minutes"
  | "pay_overtime_rate"
  | "add_shift_allowance"
  | "skip";

export type DeductionPriorityItem =
  | "attendance"
  | "leave"
  | "loan"
  | "advance"
  | "insurance"
  | "tax"
  | "recurring"
  | "penalty";

export type PayrollTimelineKind =
  | "attendance"
  | "leave"
  | "adjustment"
  | "bonus"
  | "deduction"
  | "generated"
  | "approved"
  | "paid";

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

export interface PayrollPeriod {
  id: string;
  label: string;
  year: number;
  month: number;
  startDate: string;
  endDate: string;
  payDate: string;
  workingDays: number;
  cycle: "monthly" | "biweekly" | "weekly";
  paymentDay: number;
}

export interface LateDeductionPolicy {
  graceMinutes: number;
  tiers: { afterMinutes: number; dayFraction: number }[];
}

export interface PayrollPolicies extends BaseEntity {
  id: string;
  late: LateDeductionPolicy;
  absenceDayFraction: number;
  halfDayFraction: number;
  earlyLeaveDayFraction: number;
  missingPunchDayFraction: number;
  overtimeRate: number;
  holidayOvertimeRate: number;
  weekendOvertimeRate: number;
  nightShiftAllowance: number;
  minimumWorkingMinutes: number;
  maxDeductionDayFraction: number;
  monthlyDeductionCap: number;
  autoRounding: "none" | "nearest_1" | "nearest_5" | "nearest_10";
  currency: string;
  payrollCycle: "monthly" | "biweekly" | "weekly";
  paymentDay: number;
  deductionPriority: DeductionPriorityItem[];
  leaveBehavior: Record<PayrollLeaveType, LeavePayrollBehavior>;
  leavePayFraction: Partial<Record<PayrollLeaveType, number>>;
}

export interface PayrollRule extends BaseEntity {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  when: {
    field:
      | "late_minutes"
      | "late_over_grace"
      | "absent"
      | "overtime_hours"
      | "weekend_overtime"
      | "holiday_overtime"
      | "half_day"
      | "early_leave"
      | "night_shift";
    operator: PayrollRuleOperator;
    value: number;
  };
  then: {
    action: PayrollRuleAction;
    amount: number;
  };
  description: string;
}

export interface SchedulePayrollContext {
  workingDays: DayOfWeek[];
  weekendDays: DayOfWeek[];
  gracePeriodMinutes: number;
  breakMinutes: number;
  fromTime: string;
  toTime: string;
  minimumWorkingMinutes: number;
}

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
