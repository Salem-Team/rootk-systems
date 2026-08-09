/**
 * Payroll profile/policy types — salary structure, deduction policies, and rules.
 * Split out of `payroll-engine-types.ts` to keep files small; re-exported from there.
 */
import type {
  BaseEntity,
  ContractType,
  DayOfWeek,
  DeductionPriorityItem,
  InsuranceStatus,
  LeavePayrollBehavior,
  PayrollGroup,
  PayrollLeaveType,
  PaymentMethod,
  PayrollRuleAction,
  PayrollRuleOperator,
  SalaryGrade,
  SalaryType,
  TaxStatus,
} from "./payroll-engine-types";

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

export interface DeductionCharge {
  mode: "day_fraction" | "fixed_amount";
  value: number;
}

export interface LateDeductionPolicy {
  graceMinutes: number;
  tiers: {
    afterMinutes: number;
    dayFraction: number;
    charge?: DeductionCharge;
  }[];
}

export interface PayrollPolicies extends BaseEntity {
  id: string;
  late: LateDeductionPolicy;
  absenceDayFraction: number;
  halfDayFraction: number;
  earlyLeaveDayFraction: number;
  missingPunchDayFraction: number;
  absenceCharge?: DeductionCharge;
  halfDayCharge?: DeductionCharge;
  earlyLeaveCharge?: DeductionCharge;
  missingPunchCharge?: DeductionCharge;
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
