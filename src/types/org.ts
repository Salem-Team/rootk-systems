import type { BaseEntity, Department } from "@/types";

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
  active: boolean;
}

export interface JobPosition extends BaseEntity {
  id: string;
  title: string;
  department: Department;
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

export interface WfhPolicyExtras {
  /** Master switch — when false, WFH is hidden from all employees. */
  enabled: boolean;
  allowedDepartments: Department[];
  requiresApproval: boolean;
  monthlyQuota: number;
  hybridOfficeDays: number;
}

export interface ScheduleAdminMetadata {
  attendancePolicy?: AttendancePolicyExtras;
  wfhPolicy?: WfhPolicyExtras;
}
