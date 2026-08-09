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
  /** Local-mode email→password map (never synced to API). */
  credentials: key("credentials"),
  locations: key("locations"),
  positions: key("positions"),
  departments: key("departments"),
  shifts: key("shifts"),
  approvalRules: key("approval-rules"),
  userPreferences: key("user-preferences"),
  workTasks: key("work-tasks"),
  workMeetings: key("work-meetings"),
  payrollState: key("payroll-state"),
  targetCategories: key("target-categories"),
  targetTypes: key("target-types"),
  targetTemplates: key("target-templates"),
  performanceTargets: key("performance-targets"),
  targetWarnings: key("target-warnings"),
  targetHistory: key("target-history"),
  organicAds: key("organic-ads"),
  organicAdHistory: key("organic-ad-history"),
  organicAdsSettings: key("organic-ads-settings"),
  crmStages: key("crm-stages"),
  crmSubStages: key("crm-sub-stages"),
  crmFeedbackTypes: key("crm-feedback-types"),
  crmBusinessTypes: key("crm-business-types"),
  crmLeads: key("crm-leads"),
  crmLeadActivities: key("crm-lead-activities"),
  crmLeadFeedback: key("crm-lead-feedback"),
  crmLeadHistory: key("crm-lead-history"),
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];
