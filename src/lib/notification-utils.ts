import { formatDistanceToNow, parseISO } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import type { AppNotification, NotificationCategory } from "@/types";
import type { PreferenceNotifications } from "@/types/preferences";

/** Maps feed categories → user preference toggles (sound is handled separately). */
const CATEGORY_PREF: Partial<
  Record<NotificationCategory, keyof PreferenceNotifications>
> = {
  leave: "leaveUpdates",
  attendance: "attendanceReminders",
  announcement: "announcements",
  system: "system",
  work: "work",
  payroll: "payroll",
  schedule: "schedule",
  mention: "mention",
};

export function formatNotificationTime(
  iso: string,
  locale: "en" | "ar" = "en"
): string {
  try {
    return formatDistanceToNow(parseISO(iso), {
      addSuffix: true,
      locale: locale === "ar" ? arLocale : enUS,
    });
  } catch {
    return iso;
  }
}

export function isNotificationUnread(
  item: AppNotification,
  userId: string
): boolean {
  return !item.readBy.includes(userId);
}

export function notificationMatchesPrefs(
  item: AppNotification,
  prefs?: PreferenceNotifications | null
): boolean {
  if (!prefs) return true;
  const key = CATEGORY_PREF[item.category];
  if (!key) return true;
  return prefs[key] !== false;
}

export function notificationVisibleToUser(
  item: AppNotification,
  userId: string,
  allowedAudiences: AppNotification["audience"][],
  employeeId?: string
): boolean {
  if (!allowedAudiences.includes(item.audience)) return false;
  if (item.recipientIds && item.recipientIds.length > 0) {
    if (item.recipientIds.includes(userId)) return true;
    if (employeeId && item.recipientIds.includes(employeeId)) return true;
    return false;
  }
  return true;
}
