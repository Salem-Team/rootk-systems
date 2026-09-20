import type { CrmLead, CrmNextAction } from "@/types/crm";
import {
  FOLLOW_UP_ADVANCE_MS,
  FOLLOW_UP_SCHEDULE_HORIZON_MS,
  isRemindableFollowUpAction,
  reminderFireAt,
  type FollowUpReminderSlot,
} from "@/lib/crm/follow-up-reminder-window";
import { parseMaybe } from "@/lib/crm/date-range";
import { isNativeApp } from "@/lib/native/platform";

const CHANNEL_ID = "crm_follow_ups";
const ID_BASE = 410_000;
const ID_SPAN = 2;

type LocalNotificationsPlugin = typeof import("@capacitor/local-notifications").LocalNotifications;

let pluginPromise: Promise<LocalNotificationsPlugin | null> | null = null;
let permissionAsked = false;
let actionListenerBound = false;

async function getPlugin(): Promise<LocalNotificationsPlugin | null> {
  if (!isNativeApp()) return null;
  if (!pluginPromise) {
    pluginPromise = import("@capacitor/local-notifications")
      .then((m) => m.LocalNotifications)
      .catch(() => null);
  }
  return pluginPromise;
}

function stableId(leadId: string, slot: FollowUpReminderSlot): number {
  let hash = 0;
  for (let i = 0; i < leadId.length; i += 1) {
    hash = (hash * 31 + leadId.charCodeAt(i)) >>> 0;
  }
  const offset = slot === "advance" ? 0 : 1;
  return ID_BASE + ((hash % 80_000) * ID_SPAN + offset);
}

const ACTION_LABEL: Record<string, { en: string; ar: string }> = {
  call: { en: "Call", ar: "مكالمة" },
  meeting: { en: "Meeting", ar: "ميتنج" },
};

function actionLabel(action: CrmNextAction, locale: "en" | "ar"): string {
  return ACTION_LABEL[action]?.[locale] ?? action;
}

function copyFor(
  lead: CrmLead,
  slot: FollowUpReminderSlot,
  locale: "en" | "ar"
): { title: string; body: string } {
  const action = actionLabel(lead.nextAction, locale);
  if (slot === "advance") {
    return {
      title: locale === "ar" ? `${action} بعد ربع ساعة` : `${action} in 15 minutes`,
      body: lead.name,
    };
  }
  return {
    title: locale === "ar" ? `ميعاد ${action} دلوقتي` : `${action} now`,
    body: lead.name,
  };
}

async function ensurePermission(plugin: LocalNotificationsPlugin): Promise<boolean> {
  const current = await plugin.checkPermissions();
  if (current.display === "granted") return true;
  if (permissionAsked) return false;
  permissionAsked = true;
  const next = await plugin.requestPermissions();
  return next.display === "granted";
}

async function ensureChannel(plugin: LocalNotificationsPlugin): Promise<void> {
  try {
    await plugin.createChannel({
      id: CHANNEL_ID,
      name: "CRM follow-ups",
      description: "Call and meeting reminders",
      importance: 5,
      visibility: 1,
      sound: "default",
      vibration: true,
    });
  } catch {
    /* web / older OS */
  }
}

export async function bindCrmFollowUpNotificationActions(
  onOpenLead: (leadId: string) => void
): Promise<() => void> {
  const plugin = await getPlugin();
  if (!plugin || actionListenerBound) return () => undefined;
  actionListenerBound = true;
  const handle = await plugin.addListener(
    "localNotificationActionPerformed",
    (event) => {
      const extra = event.notification.extra as { leadId?: string } | undefined;
      const leadId = extra?.leadId?.trim();
      if (leadId) onOpenLead(leadId);
    }
  );
  return () => {
    actionListenerBound = false;
    void handle.remove();
  };
}

/**
 * Schedule OS-level alarms for call/meeting follow-ups so the phone still
 * reminds the owner when the app is backgrounded or closed.
 */
export async function syncNativeCrmFollowUpReminders(
  leads: CrmLead[],
  locale: "en" | "ar" = "ar"
): Promise<void> {
  const plugin = await getPlugin();
  if (!plugin) return;
  if (!(await ensurePermission(plugin))) return;
  await ensureChannel(plugin);

  const pending = await plugin.getPending();
  const ours = pending.notifications.filter((n) => {
    const id = n.id;
    return typeof id === "number" && id >= ID_BASE && id < ID_BASE + 160_000;
  });
  if (ours.length > 0) {
    await plugin.cancel({ notifications: ours.map((n) => ({ id: n.id })) });
  }

  const now = Date.now();
  const horizon = now + FOLLOW_UP_SCHEDULE_HORIZON_MS;
  const notifications: {
    id: number;
    title: string;
    body: string;
    schedule: { at: Date; allowWhileIdle: true };
    channelId: string;
    extra: { leadId: string; slot: FollowUpReminderSlot };
  }[] = [];

  for (const lead of leads) {
    if (
      lead.status !== "active" ||
      !isRemindableFollowUpAction(lead.nextAction) ||
      !lead.nextFollowUpAt
    ) {
      continue;
    }
    const due = parseMaybe(lead.nextFollowUpAt);
    if (!due) continue;
    const dueMs = due.getTime();
    if (dueMs < now - FOLLOW_UP_ADVANCE_MS || dueMs > horizon) continue;

    for (const slot of ["advance", "due"] as FollowUpReminderSlot[]) {
      const at = reminderFireAt(due, slot);
      if (at.getTime() <= now + 5_000) continue;
      if (at.getTime() > horizon) continue;
      const copy = copyFor(lead, slot, locale);
      notifications.push({
        id: stableId(lead.id, slot),
        title: copy.title,
        body: copy.body,
        schedule: { at, allowWhileIdle: true },
        channelId: CHANNEL_ID,
        extra: { leadId: lead.id, slot },
      });
    }
  }

  if (notifications.length === 0) return;
  await plugin.schedule({ notifications });
}

export async function clearNativeCrmFollowUpReminders(): Promise<void> {
  const plugin = await getPlugin();
  if (!plugin) return;
  try {
    const pending = await plugin.getPending();
    const ours = pending.notifications.filter((n) => {
      const id = n.id;
      return typeof id === "number" && id >= ID_BASE && id < ID_BASE + 160_000;
    });
    if (ours.length > 0) {
      await plugin.cancel({ notifications: ours.map((n) => ({ id: n.id })) });
    }
  } catch {
    /* ignore */
  }
}
