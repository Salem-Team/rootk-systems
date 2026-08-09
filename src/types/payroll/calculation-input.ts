import type { AttendanceStatus } from "@/types";
import type { PayrollLeaveType } from "./enums";
import type { EmployeeSalaryProfile } from "./salary-profile";
import type { PayrollPeriod, PayrollPolicies, PayrollRule, SchedulePayrollContext } from "./policies";

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
