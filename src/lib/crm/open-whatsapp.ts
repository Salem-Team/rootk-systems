import { isNativeApp, nativePlatform } from "@/lib/native/platform";
import { normalizePhone } from "@/lib/phone-normalize";
import type { WhatsappClientApp } from "@/lib/whatsapp-accounts";

export type OpenWhatsappResult =
  | { ok: true; url: string }
  | { ok: false; reason: "invalid_phone" | "blocked" };

/** Digits-only international number for WhatsApp deep links (no +). */
export function whatsappDigits(phone: string): string | null {
  const parsed = normalizePhone(phone);
  return parsed.ok ? parsed.digits : null;
}

/**
 * Build the best URL to open a chat with `toPhone` from a specific WhatsApp
 * install (personal vs Business). Package-scoped intents matter on Android when
 * both apps are installed (company line often lives in Business).
 */
export function buildWhatsappOpenUrl(
  toPhone: string,
  app: WhatsappClientApp = "whatsapp",
  opts?: { text?: string }
): string | null {
  const digits = whatsappDigits(toPhone);
  if (!digits) return null;
  const text = opts?.text?.trim() ?? "";
  const textQuery = text ? `&text=${encodeURIComponent(text)}` : "";
  const platform = nativePlatform();

  if (platform === "android") {
    const pkg = app === "business" ? "com.whatsapp.w4b" : "com.whatsapp";
    // Forces the chosen package when both WhatsApp apps are installed.
    return `intent://send/?phone=${digits}${textQuery}#Intent;scheme=whatsapp;package=${pkg};end`;
  }

  if (platform === "ios") {
    const scheme = app === "business" ? "whatsapp-business" : "whatsapp";
    return `${scheme}://send?phone=${digits}${text ? `&text=${encodeURIComponent(text)}` : ""}`;
  }

  // Browser / PWA — wa.me uses whichever session is active in WhatsApp Web/Desktop.
  const base = `https://wa.me/${digits}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

/** Navigate in a way mobile WebViews and browsers rarely block. */
export function navigateExternal(url: string): boolean {
  if (typeof window === "undefined") return false;

  if (isNativeApp() || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) {
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
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
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
