/** Strip non-digits from a phone string. */
export function phoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Normalize to international digits (no +) for tel/WhatsApp.
 * Defaults to Egypt (+20) when the number is local.
 */
export function toInternationalPhoneDigits(
  phone: string,
  defaultCountry = "20"
): string {
  let digits = phoneDigits(phone);
  if (!digits) return "";
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith(defaultCountry)) return digits;
  if (digits.startsWith("0")) return `${defaultCountry}${digits.slice(1)}`;
  if (digits.length === 10 && digits.startsWith("1")) {
    return `${defaultCountry}${digits}`;
  }
  return digits;
}

export function telHref(phone: string): string | null {
  const digits = toInternationalPhoneDigits(phone);
  return digits ? `tel:+${digits}` : null;
}

export function whatsappHref(phone: string): string | null {
  const digits = toInternationalPhoneDigits(phone);
  return digits ? `https://wa.me/${digits}` : null;
}
