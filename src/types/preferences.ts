import type { BaseEntity } from "@/types";

export interface PreferenceNotifications {
  email: boolean;
  push: boolean;
  /** Clear in-app ringtone when a new notification arrives. */
  sound: boolean;
  attendanceReminders: boolean;
  leaveUpdates: boolean;
  announcements: boolean;
  system: boolean;
  work: boolean;
  payroll: boolean;
  schedule: boolean;
  mention: boolean;
}

/** Per-user UI preferences — never overwrite CompanySettings. */
export interface UserPreferences extends BaseEntity {
  id: string;
  userId: string;
  language: "en" | "ar";
  appearance: "system" | "light" | "dark";
  notifications: PreferenceNotifications;
}

export interface EmployeePreferenceRow {
  userId: string;
  employeeId: string;
  name: string;
  email: string;
  language: "en" | "ar";
  appearance: "system" | "light" | "dark";
  updatedAt: string;
  differsFromCompany: boolean;
}
