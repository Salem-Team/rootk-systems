/**
 * Authoritative Egyptian mobile canonicalization for Rootk CRM.
 * Used by backend, frontend, and Capacitor WebView — keep this the only implementation.
 *
 * Canonical form: E.164 `+20` + 10-digit NSN (e.g. +201012345678).
 */

export type PhoneNormalizeOk = {
  ok: true;
  /** E.164, e.g. +201012345678 */
  e164: string;
  /** National digits including leading 0, e.g. 01012345678 */
  nationalDigits: string;
  /** Country + NSN digits, no plus, e.g. 201012345678 */
  digits: string;
};

export type PhoneNormalizeErr = {
  ok: false;
  code: "empty" | "invalid";
  reason: string;
};

export type PhoneNormalizeResult = PhoneNormalizeOk | PhoneNormalizeErr;

/** Egypt mobile NSN: 10 digits starting with 10, 11, 12, or 15. */
const EG_MOBILE_NSN = /^1[0125]\d{8}$/;

const ARABIC_INDIC = /[\u0660-\u0669]/g;
const EASTERN_ARABIC = /[\u06F0-\u06F9]/g;

function foldDigits(value: string): string {
  return value
    .replace(ARABIC_INDIC, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(EASTERN_ARABIC, (d) => String(d.charCodeAt(0) - 0x06f0));
}

export function normalizeEgyptianMobile(
  input: unknown
): PhoneNormalizeResult {
  if (input === null || input === undefined) {
    return { ok: false, code: "empty", reason: "Phone is required" };
  }
  const folded = foldDigits(String(input)).trim();
  if (!folded) {
    return { ok: false, code: "empty", reason: "Phone is required" };
  }

  const stripped = folded.replace(/[\s\-().]/g, "");
  if (!/^\+?\d+$/.test(stripped)) {
    return {
      ok: false,
      code: "invalid",
      reason: "Phone contains invalid characters",
    };
  }

  let digits = stripped.startsWith("+") ? stripped.slice(1) : stripped;
  if (digits.startsWith("00")) digits = digits.slice(2);

  let nsn: string;
  if (digits.startsWith("20")) {
    nsn = digits.slice(2);
  } else if (digits.startsWith("0")) {
    nsn = digits.slice(1);
  } else if (digits.length === 10 && digits.startsWith("1")) {
    nsn = digits;
  } else {
    return {
      ok: false,
      code: "invalid",
      reason: "Unrecognized phone format",
    };
  }

  if (!EG_MOBILE_NSN.test(nsn)) {
    return {
      ok: false,
      code: "invalid",
      reason: "Not a valid Egyptian mobile number",
    };
  }

  return {
    ok: true,
    e164: `+20${nsn}`,
    nationalDigits: `0${nsn}`,
    digits: `20${nsn}`,
  };
}

export function isEgyptianMobile(input: unknown): boolean {
  return normalizeEgyptianMobile(input).ok;
}

/** Indexed lookup key, or null when the input is not a valid EG mobile. */
export function canonicalPhoneOrNull(input: unknown): string | null {
  const result = normalizeEgyptianMobile(input);
  return result.ok ? result.e164 : null;
}

/**
 * Display in familiar Egyptian national grouping: 010 1234 5678.
 * Returns null when the value is not a valid EG mobile (caller keeps original).
 */
export function formatEgyptianNationalDisplay(input: unknown): string | null {
  const result = normalizeEgyptianMobile(input);
  if (!result.ok) return null;
  const d = result.nationalDigits;
  return `${d.slice(0, 3)} ${d.slice(3, 7)} ${d.slice(7)}`;
}
