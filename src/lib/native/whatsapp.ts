import { registerPlugin } from "@capacitor/core";
import { isNativeApp, nativePlatform } from "@/lib/native/platform";
import type { WhatsappClientApp } from "@/lib/whatsapp-accounts";

export type NativeWhatsappOpenResult = {
  opened: boolean;
  packageName?: string;
  phone?: string;
};

export type NativeWhatsappInstalls = {
  personal: boolean;
  business: boolean;
};

type RootkWhatsappPlugin = {
  openChat(options: {
    phone: string;
    app: WhatsappClientApp;
    text?: string;
  }): Promise<NativeWhatsappOpenResult>;
  resolveInstall(): Promise<NativeWhatsappInstalls>;
};

const rootkWhatsapp = registerPlugin<RootkWhatsappPlugin>("RootkWhatsapp", {
  web: () => ({
    async openChat() {
      return { opened: false };
    },
    async resolveInstall() {
      return { personal: false, business: false };
    },
  }),
});

/** True when the native Android WhatsApp handoff plugin is available. */
export function canUseNativeWhatsappOpen(): boolean {
  return isNativeApp() && nativePlatform() === "android";
}

/**
 * Open customer chat inside the salesperson’s WhatsApp or WhatsApp Business
 * install via Android Intent.setPackage (avoids the company Business default).
 */
export async function openNativeWhatsappChat(options: {
  phoneDigits: string;
  app: WhatsappClientApp;
  text?: string;
}): Promise<
  | { ok: true; result: NativeWhatsappOpenResult }
  | { ok: false; reason: "not_installed" | "unavailable" | "invalid_phone" }
> {
  if (!canUseNativeWhatsappOpen()) return { ok: false, reason: "unavailable" };
  try {
    const result = await rootkWhatsapp.openChat({
      phone: options.phoneDigits,
      app: options.app,
      text: options.text,
    });
    if (!result?.opened) return { ok: false, reason: "unavailable" };
    return { ok: true, result };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error ?? "");
    if (message.includes("not_installed")) {
      return { ok: false, reason: "not_installed" };
    }
    if (message.includes("invalid_phone")) {
      return { ok: false, reason: "invalid_phone" };
    }
    // Older APK without the plugin — caller falls back to deep links.
    return { ok: false, reason: "unavailable" };
  }
}

export async function resolveNativeWhatsappInstalls(): Promise<NativeWhatsappInstalls | null> {
  if (!canUseNativeWhatsappOpen()) return null;
  try {
    return await rootkWhatsapp.resolveInstall();
  } catch {
    return null;
  }
}
