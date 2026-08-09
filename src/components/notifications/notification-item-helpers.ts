import { formatHmDuration } from "@/lib/duration-format";
import type { TranslationPath } from "@/i18n";
import type { AppNotification } from "@/types";

const DURATION_BODY_KEYS = new Set([
  "notifications.lateCheckInBody",
  "notifications.earlyLeaveBody",
]);

export function formatAtTimestamp(raw: unknown, locale: "en" | "ar"): string {
  if (typeof raw !== "string" || !raw) return String(raw ?? "");
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function notificationVars(
  item: AppNotification,
  t: (path: TranslationPath, vars?: Record<string, string | number>) => string,
  locale: "en" | "ar"
): Record<string, string | number> | undefined {
  const base = { ...(item.vars ?? {}) };
  if (base.at != null) {
    base.at = formatAtTimestamp(base.at, locale);
  }
  if (!DURATION_BODY_KEYS.has(item.bodyKey)) return base;
  const minutes = Number(base.minutes ?? 0);
  return {
    ...base,
    duration: formatHmDuration(minutes, t),
  };
}
