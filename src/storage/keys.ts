import { STORAGE_NAMESPACE } from "@/constants/company";

function key(resource: string): string {
  return `${STORAGE_NAMESPACE}.${resource}`;
}

/** Namespaced Local Storage keys — temporary DB until REST. */
export const StorageKeys = {
  meta: key("meta"),
  employees: key("employees"),
  attendance: key("attendance"),
  leave: key("leave"),
  schedule: key("schedule"),
  settings: key("settings"),
  activities: key("activities"),
  announcements: key("announcements"),
  weeklyStats: key("weekly-stats"),
  monthlyStats: key("monthly-stats"),
  notifications: key("notifications"),
  users: key("users"),
  locations: key("locations"),
  positions: key("positions"),
  shifts: key("shifts"),
  approvalRules: key("approval-rules"),
  userPreferences: key("user-preferences"),
  workTasks: key("work-tasks"),
  workMeetings: key("work-meetings"),
  payrollState: key("payroll-state"),
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];
