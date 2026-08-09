import type { BaseEntity, DayOfWeek } from "@/types";
import type {
  DeductionPriorityItem,
  LeavePayrollBehavior,
  PayrollLeaveType,
  PayrollRuleAction,
  PayrollRuleOperator,
} from "./enums";

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
  tiers: {
    afterMinutes: number;
    dayFraction: number;
    /** Optional charge override from Work Policies (fixed amount or day quantity). */
    charge?: {
      mode: "day_fraction" | "fixed_amount";
      value: number;
    };
  }[];
}

export interface PayrollPolicies extends BaseEntity {
  id: string;
  late: LateDeductionPolicy;
  absenceDayFraction: number;
  halfDayFraction: number;
  earlyLeaveDayFraction: number;
  missingPunchDayFraction: number;
  /** Work-policy charge specs (preferred over bare fractions when present). */
  absenceCharge?: { mode: "day_fraction" | "fixed_amount"; value: number };
  halfDayCharge?: { mode: "day_fraction" | "fixed_amount"; value: number };
  earlyLeaveCharge?: { mode: "day_fraction" | "fixed_amount"; value: number };
  missingPunchCharge?: { mode: "day_fraction" | "fixed_amount"; value: number };
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
