import { registerPlugin } from "@capacitor/core";
import { isNativeApp, nativePlatform } from "@/lib/native/platform";

export type OutboundCallInsight = {
  found: boolean;
  number?: string;
  type?: number;
  durationSeconds?: number;
  dateEpochMs?: number;
  answered?: boolean;
};

type CallInsightPlugin = {
  getLatestOutbound(options: {
    phone: string;
    sinceEpochMs: number;
  }): Promise<OutboundCallInsight>;
  checkPermissions(): Promise<{ callLog: PermissionState }>;
  requestPermissions(): Promise<{ callLog: PermissionState }>;
};

type PermissionState = "prompt" | "prompt-with-rationale" | "granted" | "denied";

const RootkCallInsight = registerPlugin<CallInsightPlugin>("RootkCallInsight", {
  web: () => ({
    async getLatestOutbound() {
      return { found: false };
    },
    async checkPermissions() {
      return { callLog: "denied" as const };
    },
    async requestPermissions() {
      return { callLog: "denied" as const };
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
    const current = await RootkCallInsight.checkPermissions();
    if (current.callLog === "granted") return true;
    const next = await RootkCallInsight.requestPermissions();
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
    const perms = await RootkCallInsight.checkPermissions();
    if (perms.callLog !== "granted") {
      const next = await RootkCallInsight.requestPermissions();
      if (next.callLog !== "granted") return null;
    }
  } catch {
    return null;
  }

  for (const delay of [0, 500, 1200, 2500]) {
    if (delay > 0) await sleep(delay);
    try {
      const row = await RootkCallInsight.getLatestOutbound({
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
