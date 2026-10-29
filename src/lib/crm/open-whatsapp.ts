import { isNativeApp, nativePlatform } from "@/lib/native/platform";
import {
  canUseNativeWhatsappOpen,
  openNativeWhatsappChat,
} from "@/lib/native/whatsapp";
import { normalizePhone } from "@/lib/phone-normalize";
import type { WhatsappClientApp } from "@/lib/whatsapp-accounts";

export type OpenWhatsappPlatform = "android" | "ios" | "web";

export type OpenWhatsappResult =
  | { ok: true; url: string; via: "native" | "deeplink" | "web" }
  | { ok: false; reason: "invalid_phone" | "blocked" | "not_installed" };

/** Digits-only international number for WhatsApp deep links (no +). */
export function whatsappDigits(phone: string): string | null {
  const parsed = normalizePhone(phone);
  return parsed.ok ? parsed.digits : null;
}

/**
 * Capacitor reports "web" inside Chrome/Safari on phones. Detect the real OS
 * so we can open the personal vs Business package instead of defaulting to wa.me
 * (which often lands on the company WhatsApp Business install).
 */
export function resolveWhatsappPlatform(
  userAgent?: string,
  capacitorPlatform: "web" | "android" | "ios" = nativePlatform()
): OpenWhatsappPlatform {
  if (capacitorPlatform === "android" || capacitorPlatform === "ios") {
    return capacitorPlatform;
  }
  const ua =
    userAgent ??
    (typeof navigator !== "undefined" ? navigator.userAgent : "");
  if (/Android/i.test(ua)) return "android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  return "web";
}

function androidPackage(app: WhatsappClientApp): string {
  return app === "business" ? "com.whatsapp.w4b" : "com.whatsapp";
}

/**
 * Build the best URL to open a chat with `toPhone` from a specific WhatsApp
 * install (personal vs Business). Package-scoped intents matter on Android when
 * both apps are installed (company line often lives in Business).
 */
export function buildWhatsappOpenUrl(
  toPhone: string,
  app: WhatsappClientApp = "whatsapp",
  opts?: { text?: string; platform?: OpenWhatsappPlatform; userAgent?: string }
): string | null {
  const digits = whatsappDigits(toPhone);
  if (!digits) return null;
  const text = opts?.text?.trim() ?? "";
  const textQuery = text ? `&text=${encodeURIComponent(text)}` : "";
  const platform =
    opts?.platform ?? resolveWhatsappPlatform(opts?.userAgent);

  if (platform === "android") {
    const pkg = androidPackage(app);
    const fallback = encodeURIComponent(
      text
        ? `https://api.whatsapp.com/send?phone=${digits}&text=${encodeURIComponent(text)}`
        : `https://api.whatsapp.com/send?phone=${digits}`
    );
    // Forces the chosen package when both WhatsApp apps are installed.
    // Prefer api.whatsapp.com in the fallback so Chrome still targets chat,
    // never a bare chooser that prefers company Business.
    return `intent://send/?phone=${digits}${textQuery}#Intent;scheme=whatsapp;package=${pkg};S.browser_fallback_url=${fallback};end`;
  }

  if (platform === "ios") {
    const scheme = app === "business" ? "whatsapp-business" : "whatsapp";
    return `${scheme}://send?phone=${digits}${
      text ? `&text=${encodeURIComponent(text)}` : ""
    }`;
  }

  // Desktop browser — WhatsApp Web / Desktop uses the signed-in session.
  const base = `https://api.whatsapp.com/send?phone=${digits}`;
  return text ? `${base}&text=${encodeURIComponent(text)}` : base;
}

/** Navigate in a way mobile WebViews and browsers rarely block. */
export function navigateExternal(url: string): boolean {
  if (typeof window === "undefined") return false;

  const isMobileNav =
    isNativeApp() ||
    resolveWhatsappPlatform() !== "web" ||
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

  // intent:// and whatsapp:// must navigate the current document — popups fail.
  const isDeepLink =
    url.startsWith("intent:") ||
    url.startsWith("whatsapp:") ||
    url.startsWith("whatsapp-business:");

  if (isDeepLink || isMobileNav) {
    try {
      window.location.assign(url);
      return true;
    } catch {
      /* fall through */
    }
  }

  // Prefer a real <a> click. window.open(..., "noopener") often returns null
  // even when the tab opens, which used to look like success without a handoff.
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.rel = "noopener noreferrer";
    anchor.target = "_blank";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    return true;
  } catch {
    try {
      window.open(url, "_blank", "noopener,noreferrer");
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Open WhatsApp chat with the customer using the salesperson’s chosen app.
 * On the Android Capacitor app this uses a native Intent.setPackage handoff so
 * the OS cannot silently default to the company WhatsApp Business install.
 */
export async function openWhatsappChat(
  toPhone: string,
  app: WhatsappClientApp = "whatsapp",
  opts?: { text?: string; fallbackHref?: string }
): Promise<OpenWhatsappResult> {
  const digits = whatsappDigits(toPhone);
  if (!digits && !opts?.fallbackHref?.trim()) {
    return { ok: false, reason: "invalid_phone" };
  }

  if (digits && canUseNativeWhatsappOpen()) {
    const native = await openNativeWhatsappChat({
      phoneDigits: digits,
      app,
      text: opts?.text,
    });
    if (native.ok) {
      return {
        ok: true,
        url: `native://${native.result.packageName ?? androidPackage(app)}/${digits}`,
        via: "native",
      };
    }
    if (native.reason === "not_installed") {
      return { ok: false, reason: "not_installed" };
    }
    if (native.reason === "invalid_phone") {
      return { ok: false, reason: "invalid_phone" };
    }
    // Fall through to deep link / web if the plugin is missing (older APK).
  }

  const url =
    (digits ? buildWhatsappOpenUrl(toPhone, app, opts) : null) ||
    opts?.fallbackHref?.trim() ||
    null;
  if (!url) return { ok: false, reason: "invalid_phone" };

  const opened = navigateExternal(url);
  if (!opened) return { ok: false, reason: "blocked" };

  const via =
    url.startsWith("intent:") ||
    url.startsWith("whatsapp:") ||
    url.startsWith("whatsapp-business:")
      ? "deeplink"
      : "web";
  return { ok: true, url, via };
}
