import { detectContactKind, displayCrmContact } from "@/lib/crm/contact-identity";
import {
  canonicalPhoneOrNull,
  formatEgyptianNationalDisplay,
  formatPhoneInternational,
  normalizePhone,
} from "@/lib/phone-normalize";

/** Display-friendly contact: national phone, or `@handle` for usernames. */
export function displayCrmPhone(phone: string, phoneNormalized?: string | null): string {
  if (detectContactKind(phone, phoneNormalized) !== "phone") {
    return displayCrmContact(phone, phoneNormalized);
  }
  const source = phoneNormalized || phone;
  const egyptian = formatEgyptianNationalDisplay(source);
  if (egyptian) return egyptian;
  return formatPhoneInternational(source) ?? (phone.trim() || "—");
}

export function telHref(phone: string): string | null {
  const parsed = normalizePhone(phone);
  if (parsed.ok) return `tel:${parsed.e164}`;
  const digits = phone.replace(/\D/g, "");
  return digits ? `tel:+${digits.replace(/^00/, "")}` : null;
}

export function whatsappHref(
  phone: string,
  opts?: { text?: string }
): string | null {
  const parsed = normalizePhone(phone);
  if (!parsed.ok) return null;
  const base = `https://wa.me/${parsed.digits}`;
  const text = opts?.text?.trim();
  if (!text) return base;
  return `${base}?text=${encodeURIComponent(text)}`;
}

/** Last WhatsApp account the signed-in sales user sent from (device-local). */
export const CRM_WHATSAPP_LAST_ACCOUNT_KEY = "crm.whatsapp.lastAccountId";

export function readLastWhatsappAccountId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const id = window.localStorage.getItem(CRM_WHATSAPP_LAST_ACCOUNT_KEY)?.trim();
    return id || null;
  } catch {
    return null;
  }
}

export function writeLastWhatsappAccountId(accountId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CRM_WHATSAPP_LAST_ACCOUNT_KEY, accountId);
  } catch {
    /* ignore quota / private mode */
  }
}

export function sameCrmPhone(a: string, b: string): boolean {
  const left = canonicalPhoneOrNull(a);
  const right = canonicalPhoneOrNull(b);
  if (left && right) return left === right;
  return a.replace(/\D/g, "") === b.replace(/\D/g, "");
}
