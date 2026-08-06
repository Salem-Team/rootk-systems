import type { BaseEntity } from "@/types";

export type ShiftType =
  | "morning"
  | "evening"
  | "night"
  | "flexible"
  | "hybrid"
  | "remote";

export interface OfficeLocation extends BaseEntity {
  id: string;
  name: string;
  city: string;
  address: string;
  timezone: string;
  capacity: number;
  workingDays: string;
  /** WGS84 latitude — required for office-day geofenced punches. */
  latitude?: number;
  /** WGS84 longitude — required for office-day geofenced punches. */
  longitude?: number;
  /** Allowed distance from the office pin in meters. */
  radiusMeters?: number;
  active: boolean;
}

/** Org department catalog row (CRUD). Employees store `name` as a string. */
export interface OrgDepartment extends BaseEntity {
  id: string;
  name: string;
  nameAr?: string;
  code?: string;
  color: string;
  active: boolean;
}

export interface JobPosition extends BaseEntity {
  id: string;
  title: string;
  department: string;
  grade: string;
  reportsTo: string;
  active: boolean;
}

export interface ShiftDefinition extends BaseEntity {
  id: string;
  name: string;
  /** Optional i18n key for display (e.g. admin.shiftMorning). */
  nameKey?: string;
  type: ShiftType;
  start: string;
  end: string;
  color: string;
  active: boolean;
}

export interface ApprovalRule extends BaseEntity {
  id: string;
  labelKey: string;
  requiresApproval: boolean;
  approver: string;
}

export interface AttendancePolicyExtras {
  minHours: number;
  maxHours: number;
  overtimeAfterHours: number;
  lateAfterMinutes: number;
  halfDayHours: number;
}

/** How a work-policy deduction is charged. */
export type DeductionChargeMode = "day_fraction" | "fixed_amount";

export interface DeductionCharge {
  mode: DeductionChargeMode;
  /**
   * `day_fraction`: portion of a day (1 = full, 0.5 = half).
   * `fixed_amount`: currency amount (EGP).
   */
  value: number;
}

export interface WorkLateTier {
  afterMinutes: number;
  charge: DeductionCharge;
}

/** Admin-defined attendance deductions (Work Policies → synced to payroll). */
export interface WorkDeductionPolicy {
  lateTiers: WorkLateTier[];
  absence: DeductionCharge;
  halfDay: DeductionCharge;
  earlyLeave: DeductionCharge;
  missingPunch: DeductionCharge;
}

export interface WfhPolicyExtras {
  /** Master switch — when false, WFH is hidden from all employees. */
  enabled: boolean;
  allowedDepartments: string[];
  requiresApproval: boolean;
  monthlyQuota: number;
  hybridOfficeDays: number;
}

export interface ScheduleAdminMetadata {
  attendancePolicy?: AttendancePolicyExtras;
  wfhPolicy?: WfhPolicyExtras;
  deductionPolicy?: WorkDeductionPolicy;
}
