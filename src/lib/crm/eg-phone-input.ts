import { normalizeEgyptianMobile } from "@/lib/phone-normalize";

export const EG_DIAL_CODE = "+20";

const ARABIC_INDIC = /[\u0660-\u0669]/g;
const EASTERN_ARABIC = /[\u06F0-\u06F9]/g;

function foldDigits(value: string): string {
  return value
    .replace(ARABIC_INDIC, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(EASTERN_ARABIC, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/**
 * Local Egyptian NSN digits for the +20-prefixed input (e.g. 1012345678).
 * Strips pasted country codes and a trunk 0 so the user only types the rest.
 */
export function egyptianMobileLocalDigits(raw: string): string {
  const parsed = normalizeEgyptianMobile(raw);
  if (parsed.ok) return parsed.e164.slice(EG_DIAL_CODE.length);

  let digits = foldDigits(raw).replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("20")) digits = digits.slice(2);
  digits = digits.replace(/\D/g, "").replace(/^0+/, "");
  return digits.slice(0, 10);
}

/** Value stored/submitted: E.164 when the number is complete, else the digits so far. */
export function egyptianMobileFormValue(raw: string): string {
  const nsn = egyptianMobileLocalDigits(raw);
  if (!nsn) return "";
  const parsed = normalizeEgyptianMobile(`${EG_DIAL_CODE}${nsn}`);
  return parsed.ok ? parsed.e164 : nsn;
}
