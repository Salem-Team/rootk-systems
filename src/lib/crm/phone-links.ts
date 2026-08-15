import {
  canonicalPhoneOrNull,
  formatEgyptianNationalDisplay,
  normalizeEgyptianMobile,
} from "@/lib/phone-normalize";

/** Display-friendly Egyptian national number when valid; otherwise the original string. */
export function displayCrmPhone(phone: string, phoneNormalized?: string | null): string {
  const formatted =
    formatEgyptianNationalDisplay(phoneNormalized || phone) ??
    phone.trim();
  return formatted || "—";
}

export function telHref(phone: string): string | null {
  const parsed = normalizeEgyptianMobile(phone);
  if (parsed.ok) return `tel:${parsed.e164}`;
  const digits = phone.replace(/\D/g, "");
  return digits ? `tel:+${digits.replace(/^00/, "")}` : null;
}

export function whatsappHref(phone: string): string | null {
  const parsed = normalizeEgyptianMobile(phone);
  if (parsed.ok) return `https://wa.me/${parsed.digits}`;
  return null;
}

export function sameCrmPhone(a: string, b: string): boolean {
  const left = canonicalPhoneOrNull(a);
  const right = canonicalPhoneOrNull(b);
  if (left && right) return left === right;
  return a.replace(/\D/g, "") === b.replace(/\D/g, "");
}
