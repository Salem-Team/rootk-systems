import { isNativeApp } from "@/lib/native/platform";

const CHANNEL_ID = "client_requests";
const ID_BASE = 720_000;

type LocalNotificationsPlugin = typeof import("@capacitor/local-notifications").LocalNotifications;

let pluginPromise: Promise<LocalNotificationsPlugin | null> | null = null;
let permissionAsked = false;
let actionListenerBound = false;

async function getPlugin(): Promise<LocalNotificationsPlugin | null> {
  if (!isNativeApp()) return null;
  if (!pluginPromise) {
    pluginPromise = import("@capacitor/local-notifications")
      .then((mod) => mod.LocalNotifications)
      .catch(() => null);
  }
  return pluginPromise;
}

function stableId(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 33 + key.charCodeAt(i)) >>> 0;
  }
  return ID_BASE + (hash % 40_000);
}

async function ensurePermission(
  plugin: LocalNotificationsPlugin
): Promise<boolean> {
  const current = await plugin.checkPermissions();
  if (current.display === "granted") return true;
  if (permissionAsked) return false;
  permissionAsked = true;
  const next = await plugin.requestPermissions();
  return next.display === "granted";
}

export async function bindLocalNotificationOpen(
  onOpen: (href: string) => void
): Promise<() => void> {
  const plugin = await getPlugin();
  if (!plugin || actionListenerBound) return () => undefined;
  actionListenerBound = true;
  const handle = await plugin.addListener(
    "localNotificationActionPerformed",
    (event) => {
      const extra = event.notification.extra as { href?: string } | undefined;
      const href = extra?.href?.trim();
      if (href) onOpen(href);
    }
  );
  return () => {
    actionListenerBound = false;
    void handle.remove();
  };
}

/** Show a phone banner for a request that just arrived. */
export async function presentLocalNotification(input: {
  id: string;
  title: string;
  body: string;
  href?: string;
}): Promise<void> {
  const plugin = await getPlugin();
  if (!plugin) return;
  if (!(await ensurePermission(plugin))) return;
  try {
    await plugin.createChannel({
      id: CHANNEL_ID,
      name: "Client requests",
      description: "Price, proposal, and contract requests",
      importance: 5,
      visibility: 1,
      sound: "default",
      vibration: true,
    });
  } catch {
    /* web / older OS */
  }
  await plugin.schedule({
    notifications: [
      {
        id: stableId(input.id),
        title: input.title,
        body: input.body,
        schedule: { at: new Date(Date.now() + 400), allowWhileIdle: true },
        channelId: CHANNEL_ID,
        extra: { href: input.href ?? "" },
      },
    ],
  });
}
