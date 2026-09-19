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

export function whatsappHref(phone: string): string | null {
  const parsed = normalizePhone(phone);
  if (parsed.ok) return `https://wa.me/${parsed.digits}`;
  return null;
}

export function sameCrmPhone(a: string, b: string): boolean {
  const left = canonicalPhoneOrNull(a);
  const right = canonicalPhoneOrNull(b);
  if (left && right) return left === right;
  return a.replace(/\D/g, "") === b.replace(/\D/g, "");
}
