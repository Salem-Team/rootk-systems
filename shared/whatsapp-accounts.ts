import { normalizePhone } from "./phone-normalize";

/** WhatsApp lines an employee can send from. Stored on Employee.metadata. */
export type WhatsappAccount = {
  id: string;
  label: string;
  phone: string;
};

export const WHATSAPP_ACCOUNTS_KEY = "whatsappAccounts";
export const MAX_WHATSAPP_ACCOUNTS = 12;

export type WhatsappAccountsParse =
  | { ok: true; accounts: WhatsappAccount[] }
  | { ok: false; reason: "invalid" | "label" | "phone" };

function newAccountId(): string {
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "")
      : `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
  return `wa_${uuid.slice(0, 16)}`;
}

export function readWhatsappAccounts(metadata: unknown): WhatsappAccount[] {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return [];
  }
  const raw = (metadata as Record<string, unknown>)[WHATSAPP_ACCOUNTS_KEY];
  if (!Array.isArray(raw)) return [];
  const accounts: WhatsappAccount[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const id = String(row.id ?? "").trim();
    const label = String(row.label ?? "").trim();
    const phone = String(row.phone ?? "").trim();
    if (!id || !label || !phone) continue;
    accounts.push({ id, label, phone });
  }
  return accounts;
}

export function accountsOnEmployee(employee: {
  whatsappAccounts?: WhatsappAccount[] | null;
  metadata?: unknown;
}): WhatsappAccount[] {
  if (Array.isArray(employee.whatsappAccounts)) return employee.whatsappAccounts;
  return readWhatsappAccounts(employee.metadata);
}

export function withWhatsappAccounts(
  metadata: unknown,
  accounts: WhatsappAccount[]
): Record<string, unknown> {
  const base =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? { ...(metadata as Record<string, unknown>) }
      : {};
  base[WHATSAPP_ACCOUNTS_KEY] = accounts;
  return base;
}

/** Accepts `{ accounts: [...] }` or a bare array. Phones are stored as E.164. */
export function parseWhatsappAccountsInput(input: unknown): WhatsappAccountsParse {
  const list =
    input && typeof input === "object" && !Array.isArray(input) && "accounts" in input
      ? (input as { accounts: unknown }).accounts
      : input;
  if (!Array.isArray(list) || list.length > MAX_WHATSAPP_ACCOUNTS) {
    return { ok: false, reason: "invalid" };
  }

  const accounts: WhatsappAccount[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    if (!item || typeof item !== "object") return { ok: false, reason: "invalid" };
    const row = item as Record<string, unknown>;
    const label = String(row.label ?? "").trim();
    const phoneRaw = String(row.phone ?? "").trim();
    if (!label && !phoneRaw) continue;
    if (!label || label.length > 80) return { ok: false, reason: "label" };
    const parsed = normalizePhone(phoneRaw);
    if (!parsed.ok) return { ok: false, reason: "phone" };
    if (seen.has(parsed.e164)) continue;
    seen.add(parsed.e164);
    const idRaw = String(row.id ?? "").trim();
    const id = /^[A-Za-z0-9_-]{4,48}$/.test(idRaw) ? idRaw : newAccountId();
    accounts.push({ id, label, phone: parsed.e164 });
  }
  return { ok: true, accounts };
}
