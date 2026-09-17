import { formatHmDuration } from "@/lib/duration-format";
import { formatIsoDateTime } from "@/lib/format-time";
import type { TranslationPath } from "@/i18n";
import type { AppNotification } from "@/types";

const DURATION_BODY_KEYS = new Set([
  "notifications.lateCheckInBody",
  "notifications.earlyLeaveBody",
]);

export function formatAtTimestamp(raw: unknown, locale: "en" | "ar"): string {
  if (typeof raw !== "string" || !raw) return String(raw ?? "");
  const formatted = formatIsoDateTime(raw, locale);
  return formatted === "—" ? raw : formatted;
}

const CRM_NEXT_ACTION_KEYS: Record<string, TranslationPath> = {
  call: "crm.nextAction.call",
  whatsapp: "crm.nextAction.whatsapp",
  email: "crm.nextAction.email",
  meeting: "crm.nextAction.meeting",
  follow_up: "crm.nextAction.follow_up",
  send_proposal: "crm.nextAction.send_proposal",
  none: "crm.nextAction.none",
};

export function notificationVars(
  item: AppNotification,
  t: (path: TranslationPath, vars?: Record<string, string | number>) => string,
  locale: "en" | "ar"
): Record<string, string | number> | undefined {
  const base = { ...(item.vars ?? {}) };
  if (base.at != null) {
    base.at = formatAtTimestamp(base.at, locale);
  }
  if (
    item.bodyKey === "notifications.crmFollowUpSoonBody" &&
    typeof base.action === "string"
  ) {
    const actionKey = CRM_NEXT_ACTION_KEYS[base.action];
    if (actionKey) base.action = t(actionKey);
  }
  if (!DURATION_BODY_KEYS.has(item.bodyKey)) return base;
  const minutes = Number(base.minutes ?? 0);
  return {
    ...base,
    duration: formatHmDuration(minutes, t),
  };
}
