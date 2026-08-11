import type { Department } from "@/types";

export type AdminSection =
  | "profile"
  | "policies"
  | "shifts"
  | "wfh"
  | "departments"
  | "positions"
  | "locations"
  | "calendar"
  | "notifications"
  | "approvals"
  | "employeePrefs"
  | "myPrefs"
  | "appearance"
  | "demo"
  | "permissions";

export interface OfficeBranch {
  id: string;
  name: string;
  city: string;
  address: string;
  timezone: string;
  capacity: number;
  workingDays: string;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
}

export interface ShiftDefinition {
  id: string;
  nameKey: string;
  type: "morning" | "evening" | "night" | "flexible" | "hybrid" | "remote";
  start: string;
  end: string;
  color: string;
}

export interface DepartmentAdminCard {
  department: Department;
  manager: string;
  employees: number;
  active: boolean;
  presentRate: number;
  color: string;
}

export interface JobPosition {
  id: string;
  title: string;
  department: Department;
  grade: string;
  reportsTo: string;
}

export interface PolicyState {
  workingDays: string[];
  weekend: string[];
  graceMinutes: number;
  breakMinutes: number;
  minHours: number;
  maxHours: number;
  overtimeAfterHours: number;
  lateAfterMinutes: number;
  halfDayHours: number;
}

export interface WfhPolicy {
  enabled: boolean;
  allowedDepartments: Department[];
  allowedDays: string[];
  requiresApproval: boolean;
  monthlyQuota: number;
  hybridOfficeDays: number;
}

export interface ApprovalRule {
  id: string;
  labelKey: string;
  requiresApproval: boolean;
  approver: string;
}

export interface CalendarAdminEvent {
  id: string;
  date: string;
  title: string;
  kind: "holiday" | "event" | "training" | "meeting" | "birthday";
}
