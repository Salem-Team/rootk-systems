import {
  detectContactKind,
  isCrmContactKind,
  type CrmContactKind,
} from "./contact-identity";

export const MAX_LEAD_CONTACTS = 8;

export const MAX_CONTACT_LABEL = 80;

export type LeadContactRecord = {
  kind: CrmContactKind;
  phone: string;
  phoneNormalized: string | null;
  /** Optional name for this number, used on extra contacts. */
  label?: string | null;
};

export type LeadFormContactDraft = {
  id: string;
  kind: CrmContactKind;
  value: string;
  /** ISO country when kind is phone. Defaults to Egypt in the form. */
  country?: string;
  /** Name of an extra number (who it belongs to). */
  label?: string;
};

export function cleanContactLabel(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const label = raw.trim().replace(/\s+/g, " ").slice(0, MAX_CONTACT_LABEL);
  return label || null;
}

function asMeta(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return { ...(raw as Record<string, unknown>) };
  }
  return {};
}

function parseStoredContact(raw: unknown): LeadContactRecord | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const phone = String(row.phone ?? "").trim();
  if (!phone) return null;
  const phoneNormalized =
    typeof row.phoneNormalized === "string" && row.phoneNormalized.trim()
      ? row.phoneNormalized.trim()
      : null;
  const kind = isCrmContactKind(row.kind)
    ? row.kind
    : detectContactKind(phone, phoneNormalized);
  const label = cleanContactLabel(row.label);
  return label
    ? { kind, phone, phoneNormalized, label }
    : { kind, phone, phoneNormalized };
}

export function extraContactsFromMetadata(metadata: unknown): LeadContactRecord[] {
  const meta = asMeta(metadata);
  if (!Array.isArray(meta.contacts)) return [];
  return meta.contacts
    .map(parseStoredContact)
    .filter((row): row is LeadContactRecord => Boolean(row));
}

export function primaryLeadContact(
  phone: string,
  phoneNormalized?: string | null,
  kind?: CrmContactKind | null
): LeadContactRecord {
  const trimmed = phone.trim();
  return {
    kind: kind ?? detectContactKind(trimmed, phoneNormalized),
    phone: trimmed,
    phoneNormalized: phoneNormalized ?? null,
  };
}

export function allLeadContacts(
  phone: string,
  phoneNormalized?: string | null,
  extras?: LeadContactRecord[] | null,
  kind?: CrmContactKind | null
): LeadContactRecord[] {
  return [
    primaryLeadContact(phone, phoneNormalized, kind),
    ...(extras ?? []),
  ].filter((row) => row.phone.trim());
}

export function contactSearchBlob(extras: LeadContactRecord[]): string {
  return extras
    .map((row) =>
      `${row.label ?? ""} ${row.phone} ${row.phoneNormalized ?? ""}`.trim()
    )
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function contactsMetadataPatch(
  extras: LeadContactRecord[],
  current?: unknown
): Record<string, unknown> {
  const meta = asMeta(current);
  const clean = extras
    .map((row) => {
      const label = cleanContactLabel(row.label);
      return {
        kind: row.kind,
        phone: row.phone.trim(),
        phoneNormalized: row.phoneNormalized,
        ...(label ? { label } : {}),
      };
    })
    .filter((row) => row.phone);
  if (clean.length === 0) {
    delete meta.contacts;
    delete meta.contactKeys;
    delete meta.contactSearch;
    return meta;
  }
  meta.contacts = clean;
  meta.contactKeys = clean
    .map((row) => row.phoneNormalized)
    .filter((key): key is string => Boolean(key));
  meta.contactSearch = contactSearchBlob(clean);
  return meta;
}

export function canonicalContactKeys(
  contacts: Array<{ phoneNormalized?: string | null }>
): string[] {
  const seen = new Set<string>();
  const keys: string[] = [];
  for (const row of contacts) {
    const key = row.phoneNormalized?.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    keys.push(key);
  }
  return keys;
}
