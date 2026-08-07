import type { CompanySettings, NotificationCategory, NotificationPriority } from "@/types";

/** Company-wide notification policy controlled by admin. */
export interface CompanyNotificationSettings {
  /** Deliver in-app feed notifications. */
  inApp: boolean;
  email: boolean;
  push: boolean;
  /** Default ringtone for the company (employees can still mute personally). */
  sound: boolean;
  attendanceReminders: boolean;
  leaveUpdates: boolean;
  announcements: boolean;
  system: boolean;
  work: boolean;
  payroll: boolean;
  schedule: boolean;
  mention: boolean;
  quietHoursEnabled: boolean;
  /** HH:mm local company timezone. */
  quietHoursStart: string;
  quietHoursEnd: string;
  /** Urgent priority still rings / delivers during quiet hours. */
  quietAllowUrgent: boolean;
  /** Soft-delete notifications older than N days (0 = keep forever). */
  retentionDays: number;
}

export const DEFAULT_COMPANY_NOTIFICATIONS: CompanyNotificationSettings = {
  inApp: true,
  email: true,
  push: true,
  sound: true,
  attendanceReminders: true,
  leaveUpdates: true,
  announcements: true,
  system: true,
  work: true,
  payroll: true,
  schedule: true,
  mention: true,
  quietHoursEnabled: false,
  quietHoursStart: "22:00",
  quietHoursEnd: "07:00",
  quietAllowUrgent: true,
  retentionDays: 90,
};

const CATEGORY_TO_POLICY: Record<
  NotificationCategory,
  keyof CompanyNotificationSettings
> = {
  leave: "leaveUpdates",
  attendance: "attendanceReminders",
  announcement: "announcements",
  system: "system",
  work: "work",
  payroll: "payroll",
  schedule: "schedule",
  mention: "mention",
  target: "work",
};

export function normalizeCompanyNotifications(
  raw: Partial<CompanyNotificationSettings> | undefined | null
): CompanyNotificationSettings {
  const src = raw ?? {};
  return {
    inApp: src.inApp ?? true,
    email: src.email ?? true,
    push: src.push ?? true,
    sound: src.sound ?? true,
    attendanceReminders: src.attendanceReminders ?? true,
    leaveUpdates: src.leaveUpdates ?? true,
    announcements: src.announcements ?? true,
    system: src.system ?? true,
    work: src.work ?? src.system ?? true,
    payroll: src.payroll ?? src.system ?? true,
    schedule: src.schedule ?? src.attendanceReminders ?? true,
    mention: src.mention ?? src.push ?? true,
    quietHoursEnabled: src.quietHoursEnabled ?? false,
    quietHoursStart: src.quietHoursStart ?? "22:00",
    quietHoursEnd: src.quietHoursEnd ?? "07:00",
    quietAllowUrgent: src.quietAllowUrgent ?? true,
    retentionDays: Math.max(0, Math.round(src.retentionDays ?? 90)),
  };
}

export function categoryPolicyKey(
  category: NotificationCategory
): keyof CompanyNotificationSettings {
  return CATEGORY_TO_POLICY[category] ?? "system";
}

/** Whether company policy allows creating this category at all. */
export function companyAllowsCategory(
  policy: CompanyNotificationSettings,
  category: NotificationCategory
): boolean {
  if (!policy.inApp && !policy.email && !policy.push) return false;
  if (!policy.inApp) return false;
  const key = categoryPolicyKey(category);
  return policy[key] !== false;
}

function parseHm(hm: string): number {
  const [h = "0", m = "0"] = hm.split(":");
  return Number(h) * 60 + Number(m);
}

/** Quiet hours window in company-local wall clock (supports overnight ranges). */
export function isWithinQuietHours(
  policy: CompanyNotificationSettings,
  now: Date = new Date()
): boolean {
  if (!policy.quietHoursEnabled) return false;
  const start = parseHm(policy.quietHoursStart);
  const end = parseHm(policy.quietHoursEnd);
  const mins = now.getHours() * 60 + now.getMinutes();
  if (start === end) return true;
  if (start < end) return mins >= start && mins < end;
  return mins >= start || mins < end;
}

export function companyAllowsSound(
  policy: CompanyNotificationSettings,
  priority: NotificationPriority = "normal",
  now?: Date
): boolean {
  if (!policy.sound) return false;
  if (!isWithinQuietHours(policy, now)) return true;
  if (priority === "urgent" && policy.quietAllowUrgent) return true;
  return false;
}

export function withNormalizedSettingsNotifications(
  settings: CompanySettings
): CompanySettings {
  return {
    ...settings,
    notifications: normalizeCompanyNotifications(settings.notifications),
  };
}
