import { normalizeEgyptianMobile } from "./phone-normalize";

export const CRM_CONTACT_KINDS = [
  "phone",
  "whatsapp",
  "instagram",
  "telegram",
  "facebook",
  "tiktok",
  "linkedin",
  "other",
] as const;

export type CrmContactKind = (typeof CRM_CONTACT_KINDS)[number];

const HANDLE_PREFIX = "h:";
const HANDLE_RE = /^[a-z0-9][a-z0-9._-]{0,62}$/i;

const URL_KIND: Array<{ re: RegExp; kind: CrmContactKind }> = [
  { re: /(?:https?:\/\/)?(?:www\.)?wa\.me\//i, kind: "whatsapp" },
  { re: /(?:https?:\/\/)?(?:www\.)?whatsapp\.com\//i, kind: "whatsapp" },
  { re: /(?:https?:\/\/)?(?:www\.)?t\.me\//i, kind: "telegram" },
  { re: /(?:https?:\/\/)?(?:www\.)?telegram\.me\//i, kind: "telegram" },
  { re: /(?:https?:\/\/)?(?:www\.)?instagram\.com\//i, kind: "instagram" },
  { re: /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@?/i, kind: "tiktok" },
  { re: /(?:https?:\/\/)?(?:www\.)?(?:m\.)?facebook\.com\//i, kind: "facebook" },
  { re: /(?:https?:\/\/)?(?:www\.)?fb\.com\//i, kind: "facebook" },
  { re: /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\//i, kind: "linkedin" },
];

export function isCrmContactKind(value: unknown): value is CrmContactKind {
  return (
    typeof value === "string" &&
    (CRM_CONTACT_KINDS as readonly string[]).includes(value)
  );
}

export function isHandleContactKind(kind: CrmContactKind): boolean {
  return kind !== "phone";
}

export function isHandleCanonical(value: string | null | undefined): boolean {
  return Boolean(value?.startsWith(HANDLE_PREFIX));
}

export function parseHandleCanonical(value: string | null | undefined): {
  kind: CrmContactKind;
  handle: string;
} | null {
  if (!value?.startsWith(HANDLE_PREFIX)) return null;
  const rest = value.slice(HANDLE_PREFIX.length);
  const idx = rest.indexOf(":");
  if (idx <= 0) return null;
  const kind = rest.slice(0, idx);
  const handle = rest.slice(idx + 1).trim().toLowerCase();
  if (!isCrmContactKind(kind) || kind === "phone" || !handle) return null;
  return { kind, handle };
}

export function canonicalHandleKey(kind: CrmContactKind, handle: string): string {
  return `${HANDLE_PREFIX}${kind}:${handle.toLowerCase()}`;
}

function stripHandleNoise(raw: string): { kind?: CrmContactKind; handle: string } {
  let value = raw.trim();
  let inferred: CrmContactKind | undefined;
  for (const row of URL_KIND) {
    if (row.re.test(value)) {
      inferred = row.kind;
      value = value.replace(row.re, "");
      break;
    }
  }
  value = value.split(/[?#]/)[0] ?? value;
  value = value.replace(/\/+$/, "");
  value = value.replace(/^@+/, "");
  value = value.replace(/\s+/g, "");
  return { kind: inferred, handle: value };
}

export function extractHandle(raw: string): string {
  return stripHandleNoise(raw).handle.toLowerCase();
}

export function looksLikeHandle(raw: string): boolean {
  const { handle } = stripHandleNoise(raw);
  if (!handle || HANDLE_RE.test(handle) === false) return false;
  return /[a-z]/i.test(handle);
}

export type ResolvedCrmContact = {
  kind: CrmContactKind;
  /** Display value stored in `phone`. */
  phone: string;
  /** E.164, `h:kind:handle`, or null for legacy unparseable phones. */
  phoneNormalized: string | null;
};

export class ContactIdentityError extends Error {
  code: "empty" | "invalid_phone" | "invalid_handle";
  constructor(code: "empty" | "invalid_phone" | "invalid_handle", message: string) {
    super(message);
    this.code = code;
  }
}

export function resolveCrmContact(input: {
  raw: unknown;
  kind?: unknown;
  previousPhone?: string;
  previousNormalized?: string | null;
}): ResolvedCrmContact {
  const trimmed = String(input.raw ?? "").trim();
  if (!trimmed) {
    throw new ContactIdentityError("empty", "Contact is required");
  }

  let kind: CrmContactKind | undefined = isCrmContactKind(input.kind)
    ? input.kind
    : undefined;
  const prev =
    input.previousNormalized != null
      ? parseHandleCanonical(input.previousNormalized)
      : null;
  if (!kind && prev) kind = prev.kind;

  const asPhone = normalizeEgyptianMobile(trimmed);
  if (asPhone.ok && (!kind || kind === "phone" || kind === "whatsapp")) {
    return {
      kind: "phone",
      phone: trimmed,
      phoneNormalized: asPhone.e164,
    };
  }

  if (!kind || kind === "phone") {
    const stripped = stripHandleNoise(trimmed);
    if (looksLikeHandle(trimmed)) {
      kind = stripped.kind ?? "whatsapp";
    }
  }

  if (!kind || kind === "phone") {
    const unchanged =
      input.previousPhone !== undefined &&
      input.previousPhone.trim() === trimmed;
    if (unchanged) {
      return {
        kind: prev?.kind ?? "phone",
        phone: trimmed,
        phoneNormalized: input.previousNormalized?.trim() || null,
      };
    }
    throw new ContactIdentityError(
      "invalid_phone",
      "Not a valid Egyptian mobile number"
    );
  }

  const stripped = stripHandleNoise(trimmed);
  const handle = stripped.handle.toLowerCase();
  if (!handle || !HANDLE_RE.test(handle) || !/[a-z]/i.test(handle)) {
    throw new ContactIdentityError("invalid_handle", "Not a valid username");
  }
  const resolvedKind = stripped.kind ?? kind;
  return {
    kind: resolvedKind,
    phone: `@${handle}`,
    phoneNormalized: canonicalHandleKey(resolvedKind, handle),
  };
}

export function detectContactKind(
  phone: string,
  phoneNormalized?: string | null
): CrmContactKind {
  const parsed = parseHandleCanonical(phoneNormalized);
  if (parsed) return parsed.kind;
  if (normalizeEgyptianMobile(phone).ok) return "phone";
  if (looksLikeHandle(phone)) {
    return stripHandleNoise(phone).kind ?? "whatsapp";
  }
  return "phone";
}

export function displayCrmContact(
  phone: string,
  phoneNormalized?: string | null
): string {
  const parsed = parseHandleCanonical(phoneNormalized);
  if (parsed) return `@${parsed.handle}`;
  return phone.trim() || "—";
}

export function contactFieldValue(
  phone: string,
  phoneNormalized?: string | null
): string {
  const parsed = parseHandleCanonical(phoneNormalized);
  if (parsed) return parsed.handle;
  return phone;
}

export function telHrefForContact(
  phone: string,
  phoneNormalized?: string | null
): string | null {
  if (detectContactKind(phone, phoneNormalized) !== "phone") return null;
  const parsed = normalizeEgyptianMobile(phoneNormalized || phone);
  if (parsed.ok) return `tel:${parsed.e164}`;
  const digits = phone.replace(/\D/g, "");
  return digits ? `tel:+${digits.replace(/^00/, "")}` : null;
}

export function contactProfileHref(
  phone: string,
  phoneNormalized?: string | null
): string | null {
  const kind = detectContactKind(phone, phoneNormalized);
  if (kind === "phone") {
    const parsed = normalizeEgyptianMobile(phoneNormalized || phone);
    return parsed.ok ? `https://wa.me/${parsed.digits}` : null;
  }
  const handle =
    parseHandleCanonical(phoneNormalized)?.handle ?? extractHandle(phone);
  if (!handle) return null;
  switch (kind) {
    case "whatsapp":
      return `https://wa.me/${encodeURIComponent(handle)}`;
    case "instagram":
      return `https://instagram.com/${encodeURIComponent(handle)}`;
    case "telegram":
      return `https://t.me/${encodeURIComponent(handle)}`;
    case "tiktok":
      return `https://www.tiktok.com/@${encodeURIComponent(handle)}`;
    case "facebook":
      return `https://facebook.com/${encodeURIComponent(handle)}`;
    case "linkedin":
      return `https://www.linkedin.com/in/${encodeURIComponent(handle)}`;
    default:
      return null;
  }
}
