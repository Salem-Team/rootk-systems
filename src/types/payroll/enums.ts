/**
 * Payroll domain enums — NestJS / Prisma-ready shapes.
 * UI must not invent calculation fields; consume engine outputs only.
 */

import type { LeaveType } from "@/types";

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
