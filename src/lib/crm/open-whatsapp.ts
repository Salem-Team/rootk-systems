import { isNativeApp, nativePlatform } from "@/lib/native/platform";
import { normalizePhone } from "@/lib/phone-normalize";
import type { WhatsappClientApp } from "@/lib/whatsapp-accounts";

export type OpenWhatsappPlatform = "android" | "ios" | "web";

export type OpenWhatsappResult =
  | { ok: true; url: string }
  | { ok: false; reason: "invalid_phone" | "blocked" };

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
        ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
        : `https://wa.me/${digits}`
    );
    // Forces the chosen package when both WhatsApp apps are installed.
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

  const popup = window.open(url, "_blank", "noopener,noreferrer");
  if (popup) return true;

  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.rel = "noopener noreferrer";
    if (!isDeepLink) anchor.target = "_blank";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    return true;
  } catch {
    return false;
  }
}

/** Open WhatsApp chat with the customer using the salesperson’s chosen app. */
export function openWhatsappChat(
  toPhone: string,
  app: WhatsappClientApp = "whatsapp",
  opts?: { text?: string; fallbackHref?: string }
): OpenWhatsappResult {
  const url =
    buildWhatsappOpenUrl(toPhone, app, opts) ||
    opts?.fallbackHref?.trim() ||
    null;
  if (!url) return { ok: false, reason: "invalid_phone" };
  const opened = navigateExternal(url);
  return opened ? { ok: true, url } : { ok: false, reason: "blocked" };
}
