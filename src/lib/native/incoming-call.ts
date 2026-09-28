import { buildIncomingCallerIndex } from "@/lib/crm/incoming-caller";
import { displayCrmPhone } from "@/lib/crm/phone-links";
import { isNativeApp, nativePlatform } from "@/lib/native/platform";
import {
  rootkCallInsight,
  type IncomingCallEvent,
  type IncomingLeadCardInput,
} from "@/lib/native/call-insight";
import type { CrmLead } from "@/types/crm";

const CHANNEL_ID = "crm_incoming_calls_v2";
const NOTIFICATION_ID = 420_001;

type LocalNotificationsPlugin = typeof import("@capacitor/local-notifications").LocalNotifications;

let pluginPromise: Promise<LocalNotificationsPlugin | null> | null = null;

async function notifications(): Promise<LocalNotificationsPlugin | null> {
  if (!isNativeApp()) return null;
  if (!pluginPromise) {
    pluginPromise = import("@capacitor/local-notifications")
      .then((mod) => mod.LocalNotifications)
      .catch(() => null);
  }
  return pluginPromise;
}

export function incomingCallsSupported(): boolean {
  return isNativeApp() && nativePlatform() === "android";
}

export type IncomingCallReadiness = {
  screening: boolean;
  overlay: boolean;
  phone: boolean;
  notifications: boolean;
};

const notReady: IncomingCallReadiness = {
  screening: false,
  overlay: false,
  phone: false,
  notifications: false,
};

export function incomingCallerReady(readiness: IncomingCallReadiness): boolean {
  return (
    readiness.screening &&
    readiness.overlay &&
    readiness.phone &&
    readiness.notifications
  );
}

export async function ensureIncomingCallAccess(): Promise<void> {
  if (!incomingCallsSupported()) return;
  try {
    const current = await rootkCallInsight.checkPermissions();
    if (current.callLog !== "granted" || current.phoneState !== "granted") {
      await rootkCallInsight.requestPermissions();
    }
  } catch {
    /* runtime permission UI unavailable */
  }
  const plugin = await notifications();
  if (!plugin) return;
  try {
    const current = await plugin.checkPermissions();
    if (current.display === "granted") return;
    await plugin.requestPermissions();
  } catch {
    /* notification prompt unavailable */
  }
}

export async function readIncomingCallReadiness(): Promise<IncomingCallReadiness> {
  if (!incomingCallsSupported()) return notReady;
  const caps = await readIncomingCapabilities();
  let phone = false;
  try {
    const perms = await rootkCallInsight.checkPermissions();
    phone = perms.callLog === "granted" && perms.phoneState === "granted";
  } catch {
    phone = false;
  }
  let notificationsGranted = false;
  const plugin = await notifications();
  if (plugin) {
    try {
      const current = await plugin.checkPermissions();
      notificationsGranted = current.display === "granted";
    } catch {
      notificationsGranted = false;
    }
  }
  return {
    screening: caps.screening,
    overlay: caps.overlay,
    phone,
    notifications: notificationsGranted,
  };
}

/** Ask only for the grants still missing, in the order the system expects. */
export async function activateIncomingCaller(): Promise<IncomingCallReadiness> {
  await ensureIncomingCallAccess();
  const caps = await readIncomingCapabilities();
  if (!caps.screening) await askScreeningRole();
  const afterRole = await readIncomingCapabilities();
  if (!afterRole.overlay) await askOverlayPermission();
  return readIncomingCallReadiness();
}

export async function replayRecentIncomingCall(): Promise<void> {
  if (!incomingCallsSupported()) return;
  try {
    await rootkCallInsight.replayRecentIncoming();
  } catch {
    /* plugin not ready */
  }
}

export async function syncIncomingLeadCache(
  leads: CrmLead[],
  labels: {
    rtl: boolean;
    title: string;
    request: string;
    budget: string;
    empty: string;
    open: string;
    hide: string;
  }
): Promise<void> {
  if (!incomingCallsSupported()) return;
  const index = buildIncomingCallerIndex(leads, labels, displayCrmPhone);
  try {
    await rootkCallInsight.syncIncomingLeads({
      index: JSON.stringify(index),
    });
  } catch {
    /* native index unavailable until the Android build includes it */
  }
}

export async function startIncomingCallWatch(): Promise<void> {
  if (!incomingCallsSupported()) return;
  await rootkCallInsight.startIncomingWatch();
}

export async function stopIncomingCallWatch(): Promise<void> {
  if (!incomingCallsSupported()) return;
  try {
    await rootkCallInsight.stopIncomingWatch();
  } catch {
    /* already stopped */
  }
}

export async function consumePendingIncomingCall(): Promise<IncomingCallEvent | null> {
  if (!incomingCallsSupported()) return null;
  try {
    const event = await rootkCallInsight.consumePendingIncoming();
    if (!event?.number && !event?.leadId) return null;
    return event;
  } catch {
    return null;
  }
}

export async function listenForIncomingCalls(
  onCall: (event: IncomingCallEvent) => void,
  onOpenLead: (leadId: string) => void,
  onDismiss: () => void
): Promise<() => void> {
  if (!incomingCallsSupported()) return () => undefined;
  const incoming = await rootkCallInsight.addListener("incomingCall", onCall);
  const open = await rootkCallInsight.addListener("openIncomingLead", (event) => {
    const leadId = event.leadId?.trim();
    if (leadId) onOpenLead(leadId);
  });
  const dismissed = await rootkCallInsight.addListener("incomingCardDismissed", onDismiss);
  return () => {
    void incoming.remove();
    void open.remove();
    void dismissed.remove();
  };
}

export async function readIncomingCapabilities(): Promise<{
  overlay: boolean;
  screening: boolean;
}> {
  if (!incomingCallsSupported()) return { overlay: false, screening: false };
  try {
    return await rootkCallInsight.incomingCapabilities();
  } catch {
    return { overlay: false, screening: false };
  }
}

export async function askOverlayPermission(): Promise<boolean> {
  if (!incomingCallsSupported()) return false;
  try {
    const result = await rootkCallInsight.requestOverlayPermission();
    return result.granted === true;
  } catch {
    return false;
  }
}

export async function askScreeningRole(): Promise<boolean> {
  if (!incomingCallsSupported()) return false;
  try {
    const result = await rootkCallInsight.requestScreeningRole();
    return result.granted === true;
  } catch {
    return false;
  }
}

export async function presentIncomingLeadCard(
  input: IncomingLeadCardInput
): Promise<boolean> {
  if (!incomingCallsSupported()) return false;
  try {
    const result = await rootkCallInsight.showIncomingLeadCard(input);
    return result.shown === true;
  } catch {
    return false;
  }
}

export async function dismissIncomingLeadCard(): Promise<void> {
  if (!incomingCallsSupported()) return;
  try {
    await rootkCallInsight.hideIncomingLeadCard();
  } catch {
    /* overlay already gone */
  }
}

export async function notifyIncomingLead(input: {
  leadId: string;
  title: string;
  body: string;
}): Promise<void> {
  const plugin = await notifications();
  if (!plugin) return;
  try {
    const current = await plugin.checkPermissions();
    if (current.display !== "granted") {
      const next = await plugin.requestPermissions();
      if (next.display !== "granted") return;
    }
    await plugin.createChannel({
      id: CHANNEL_ID,
      name: "Incoming CRM calls",
      description: "Who is calling, what they need, and their budget",
      importance: 5,
      visibility: 1,
      vibration: true,
    });
    await plugin.schedule({
      notifications: [
        {
          id: NOTIFICATION_ID,
          title: input.title,
          body: input.body,
          channelId: CHANNEL_ID,
          schedule: { at: new Date(Date.now() + 250) },
          extra: { leadId: input.leadId, kind: "incoming" },
        },
      ],
    });
  } catch {
    /* notifications are a fallback */
  }
}

export async function cancelIncomingLeadNotification(): Promise<void> {
  const plugin = await notifications();
  if (!plugin) return;
  try {
    await plugin.cancel({ notifications: [{ id: NOTIFICATION_ID }] });
  } catch {
    /* already gone */
  }
}
