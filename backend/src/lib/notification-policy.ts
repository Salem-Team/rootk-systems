export interface CompanyNotificationSettings {
  inApp: boolean;
  email: boolean;
  push: boolean;
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
  quietHoursStart: string;
  quietHoursEnd: string;
  quietAllowUrgent: boolean;
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

const CATEGORY_TO_POLICY: Record<string, keyof CompanyNotificationSettings> = {
  leave: "leaveUpdates",
  attendance: "attendanceReminders",
  announcement: "announcements",
  system: "system",
  work: "work",
  payroll: "payroll",
  schedule: "schedule",
  mention: "mention",
  target: "work",
  organic_ad: "work",
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

export function companyAllowsCategory(
  policy: CompanyNotificationSettings,
  category: string
): boolean {
  if (!policy.inApp) return false;
  const key = CATEGORY_TO_POLICY[category] ?? "system";
  return Boolean(policy[key]);
}
