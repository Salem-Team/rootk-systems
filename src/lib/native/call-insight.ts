import { registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import { isNativeApp, nativePlatform } from "@/lib/native/platform";

export type OutboundCallInsight = {
  found: boolean;
  number?: string;
  type?: number;
  durationSeconds?: number;
  dateEpochMs?: number;
  answered?: boolean;
};

export type IncomingCallEvent = {
  number: string;
  state: string;
  leadId?: string;
};

export type IncomingLeadCardInput = {
  leadId: string;
  title: string;
  name: string;
  phone: string;
  company: string;
  requestLabel: string;
  request: string;
  budgetLabel: string;
  budget: string;
  openLabel: string;
  dismissLabel: string;
  rtl: boolean;
};

type PermissionState = "prompt" | "prompt-with-rationale" | "granted" | "denied";

type CallInsightPermissions = {
  callLog: PermissionState;
  phoneState?: PermissionState;
};

type CallInsightPlugin = {
  getLatestOutbound(options: {
    phone: string;
    sinceEpochMs: number;
  }): Promise<OutboundCallInsight>;
  checkPermissions(): Promise<CallInsightPermissions>;
  requestPermissions(): Promise<CallInsightPermissions>;
  startIncomingWatch(): Promise<void>;
  stopIncomingWatch(): Promise<void>;
  consumePendingIncoming(): Promise<IncomingCallEvent>;
  incomingCapabilities(): Promise<{ overlay: boolean; screening: boolean }>;
  requestOverlayPermission(): Promise<{ granted: boolean }>;
  requestScreeningRole(): Promise<{ granted: boolean }>;
  showIncomingLeadCard(options: IncomingLeadCardInput): Promise<{ shown: boolean }>;
  hideIncomingLeadCard(): Promise<void>;
  addListener(
    eventName: "incomingCall",
    listenerFunc: (event: IncomingCallEvent) => void
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: "openIncomingLead",
    listenerFunc: (event: { leadId: string }) => void
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: "incomingCardDismissed",
    listenerFunc: () => void
  ): Promise<PluginListenerHandle>;
};

const denied: PermissionState = "denied";

export const rootkCallInsight = registerPlugin<CallInsightPlugin>("RootkCallInsight", {
  web: () => ({
    async getLatestOutbound() {
      return { found: false };
    },
    async checkPermissions() {
      return { callLog: denied, phoneState: denied };
    },
    async requestPermissions() {
      return { callLog: denied, phoneState: denied };
    },
    async startIncomingWatch() {},
    async stopIncomingWatch() {},
    async consumePendingIncoming() {
      return { number: "", state: "idle", leadId: "" };
    },
    async incomingCapabilities() {
      return { overlay: false, screening: false };
    },
    async requestOverlayPermission() {
      return { granted: false };
    },
    async requestScreeningRole() {
      return { granted: false };
    },
    async showIncomingLeadCard() {
      return { shown: false };
    },
    async hideIncomingLeadCard() {},
    async addListener() {
      return { remove: async () => undefined };
    },
  }),
});

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Ask for Call Log before dialing so resume can read talk time. Android only. */
export async function ensureCallInsightPermission(): Promise<boolean> {
  if (!isNativeApp() || nativePlatform() !== "android") return false;
  try {
    const current = await rootkCallInsight.checkPermissions();
    if (current.callLog === "granted") return true;
    const next = await rootkCallInsight.requestPermissions();
    return next.callLog === "granted";
  } catch {
    return false;
  }
}

/**
 * Read Android CallLog for the just-dialed outbound number.
 * `durationSeconds` is talk/connected time (0 = never answered). Retries briefly
 * because the OS often writes the row a moment after the call ends.
 */
export async function lookupOutboundCallInsight(options: {
  phone: string;
  sinceEpochMs: number;
}): Promise<OutboundCallInsight | null> {
  if (!isNativeApp() || nativePlatform() !== "android") return null;
  try {
    const perms = await rootkCallInsight.checkPermissions();
    if (perms.callLog !== "granted") {
      const next = await rootkCallInsight.requestPermissions();
      if (next.callLog !== "granted") return null;
    }
  } catch {
    return null;
  }

  for (const delay of [0, 500, 1200, 2500]) {
    if (delay > 0) await sleep(delay);
    try {
      const row = await rootkCallInsight.getLatestOutbound({
        phone: options.phone,
        sinceEpochMs: options.sinceEpochMs,
      });
      if (row?.found) return row;
    } catch {
      return null;
    }
  }
  return { found: false };
}
