import { isNativeApp, nativePlatform } from "@/lib/native/platform";
import {
  rootkCallInsight,
  type IncomingCallEvent,
  type IncomingLeadCardInput,
} from "@/lib/native/call-insight";

const CHANNEL_ID = "crm_incoming_calls";
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

export async function ensureIncomingCallAccess(): Promise<void> {
  if (!incomingCallsSupported()) return;
  try {
    const current = await rootkCallInsight.checkPermissions();
    if (current.callLog === "granted") return;
    await rootkCallInsight.requestPermissions();
  } catch {
    /* permission UI unavailable */
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
    if (!event?.number) return null;
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
