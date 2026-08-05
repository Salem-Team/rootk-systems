import type { CompanySettings } from "@/types";
import type { PreferenceNotifications } from "@/types/preferences";
import {
  DEFAULT_COMPANY_NOTIFICATIONS,
  normalizeCompanyNotifications,
  type CompanyNotificationSettings,
} from "@/lib/notification-policy";

/** Keys shared between company policy and personal prefs (excludes client-only sound timing). */
export const COMPANY_NOTIFICATION_KEYS = [
  "email",
  "push",
  "attendanceReminders",
  "leaveUpdates",
  "announcements",
  "system",
  "work",
  "payroll",
  "schedule",
  "mention",
] as const satisfies ReadonlyArray<keyof PreferenceNotifications>;

export function normalizePreferenceNotifications(
  notifications: Partial<PreferenceNotifications> = {}
): PreferenceNotifications {
  return {
    email: notifications.email ?? true,
    push: notifications.push ?? true,
    sound: notifications.sound ?? true,
    attendanceReminders: notifications.attendanceReminders ?? true,
    leaveUpdates: notifications.leaveUpdates ?? true,
    announcements: notifications.announcements ?? true,
    system: notifications.system ?? true,
    work: notifications.work ?? notifications.system ?? true,
    payroll: notifications.payroll ?? notifications.system ?? true,
    schedule: notifications.schedule ?? notifications.attendanceReminders ?? true,
    mention: notifications.mention ?? notifications.push ?? true,
  };
}

/** Personal prefs clipped to what the company still allows. */
export function intersectPrefsWithCompany(
  personal: PreferenceNotifications,
  company: CompanyNotificationSettings
): PreferenceNotifications {
  const c = normalizeCompanyNotifications(company);
  return {
    email: personal.email && c.email,
    push: personal.push && c.push,
    sound: personal.sound && c.sound,
    attendanceReminders: personal.attendanceReminders && c.attendanceReminders,
    leaveUpdates: personal.leaveUpdates && c.leaveUpdates,
    announcements: personal.announcements && c.announcements,
    system: personal.system && c.system,
    work: personal.work && c.work,
    payroll: personal.payroll && c.payroll,
    schedule: personal.schedule && c.schedule,
    mention: personal.mention && c.mention,
  };
}

/** Prefs copied from company policy (personal sound stays on by default). */
export function prefsFromCompanyPolicy(
  company: CompanyNotificationSettings
): PreferenceNotifications {
  const c = normalizeCompanyNotifications(company);
  return normalizePreferenceNotifications({
    email: c.email,
    push: c.push,
    sound: true,
    attendanceReminders: c.attendanceReminders,
    leaveUpdates: c.leaveUpdates,
    announcements: c.announcements,
    system: c.system,
    work: c.work,
    payroll: c.payroll,
    schedule: c.schedule,
    mention: c.mention,
  });
}

/** Compare company-policy fields — ignore personal-only nuances. */
export function companyNotificationsDiffer(
  personal: PreferenceNotifications | undefined,
  company: CompanySettings["notifications"]
): boolean {
  if (!personal) return false;
  const c = normalizeCompanyNotifications(company);
  return COMPANY_NOTIFICATION_KEYS.some((key) => personal[key] !== c[key]);
}

export { DEFAULT_COMPANY_NOTIFICATIONS, normalizeCompanyNotifications };
