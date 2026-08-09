/**
 * Payroll domain types — NestJS / Prisma-ready shapes.
 * UI must not invent calculation fields; consume engine outputs only.
 */

export type AttendanceStatus =
  | "present"
  | "absent"
  | "late"
  | "wfh"
  | "on_leave"
  | "half_day"
  | "early_leave"
  | "holiday"
  | "weekend"
  | "business_trip";

export type DayOfWeek =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

export type Department =
  | "Engineering"
  | "Design"
  | "Product"
  | "HR"
  | "Finance"
  | "Marketing"
  | "Operations"
  | "Sales";

export type LeaveType =
  | "annual"
  | "sick"
  | "personal"
  | "unpaid"
  | "maternity"
  | "emergency";

/** Minimal entity stamp used by payroll payloads. */
export interface BaseEntity {
  companyId?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  deletedAt?: string | null;
  isArchived?: boolean;
  version?: number;
  metadata?: Record<string, unknown>;
}

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

/**
 * Barrel re-exports — split into `payroll-engine-types-profile.ts` (salary
 * structure, policies, rules) and `payroll-engine-types-payslip.ts`
 * (calculation output, runs, reports) to keep each file small.
 * Public API (import paths) is unchanged for consumers.
 */
export * from "./payroll-engine-types-profile";
export * from "./payroll-engine-types-payslip";
