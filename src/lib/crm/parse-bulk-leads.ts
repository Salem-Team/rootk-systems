import { formatEgyptianNationalDisplay, normalizeEgyptianMobile } from "@/lib/phone-normalize";
import type { PhoneNormalizeOk } from "@/lib/phone-normalize";

export const MAX_BULK_ADD_LEADS = 500;

const ARABIC_INDIC = /[\u0660-\u0669]/g;
const EASTERN_ARABIC = /[\u06F0-\u06F9]/g;
/** Compact Egyptian mobile candidates after folding digits and stripping separators. */
const COMPACT_MOBILE = /(?:\+|00)?(?:20)?0?1[0125]\d{8}/g;
const HEADER_LINE =
  /^(name|phone|mobile|lead|whatsapp|اسم|موبايل|هاتف|تليفون|رقم)([,\t;| ]|$)/i;

export type ParsedBulkLead = {
  name: string;
  phone: string;
  e164: string;
};

export type BulkLeadParseIssue = {
  raw: string;
  reason: "invalid" | "duplicate";
};

export type ParsedBulkLeads = {
  rows: ParsedBulkLead[];
  invalid: BulkLeadParseIssue[];
  duplicates: BulkLeadParseIssue[];
  truncated: boolean;
};

function foldDigits(value: string): string {
  return value
    .replace(ARABIC_INDIC, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(EASTERN_ARABIC, (d) => String(d.charCodeAt(0) - 0x06f0));
}

function extractPhones(text: string): PhoneNormalizeOk[] {
  const compact = foldDigits(text).replace(/[\s\-().]/g, "");
  const found: PhoneNormalizeOk[] = [];
  const re = new RegExp(COMPACT_MOBILE.source, "g");
  let match: RegExpExecArray | null;
  while ((match = re.exec(compact))) {
    const parsed = normalizeEgyptianMobile(match[0]);
    if (parsed.ok) found.push(parsed);
  }
  return found;
}

function leftoverName(line: string): string {
  let rest = foldDigits(line);
  for (const phone of extractPhones(line)) {
    const nsn = phone.nationalDigits.slice(1);
    const flexible = new RegExp(
      `(?:\\+|00)?(?:20)?0?${nsn.split("").join("[\\s\\-().]*")}`
    );
    rest = rest.replace(flexible, " ");
  }
  const name = rest
    .replace(/[\s,;|+\-().:/\\]+/g, " ")
    .replace(/[،؛]/g, " ")
    .trim();
  if (!/\p{L}/u.test(name)) return "";
  if (/^(name|phone|mobile|lead|رقم|اسم|موبايل|هاتف)$/i.test(name)) return "";
  return name;
}

function isHeaderLine(line: string, phones: PhoneNormalizeOk[]): boolean {
  if (phones.length > 0) return false;
  const normalized = foldDigits(line).trim().toLowerCase().replace(/\s+/g, " ");
  if (HEADER_LINE.test(normalized)) return true;
  return /^(name|اسم).{0,24}(phone|mobile|موبايل|هاتف)/i.test(normalized);
}

function displayName(phone: PhoneNormalizeOk, leftover: string): string {
  if (leftover) return leftover;
  return formatEgyptianNationalDisplay(phone.e164) ?? phone.nationalDigits;
}

/** Parse pasted CRM numbers (one per line, or comma/tab mixed with optional names). */
export function parseBulkLeads(raw: string, maxRows = MAX_BULK_ADD_LEADS): ParsedBulkLeads {
  const text = raw.replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/);
  const rows: ParsedBulkLead[] = [];
  const invalid: BulkLeadParseIssue[] = [];
  const duplicates: BulkLeadParseIssue[] = [];
  const seen = new Set<string>();
  let truncated = false;

  for (const original of lines) {
    const line = original.trim();
    if (!line) continue;
    const phones = extractPhones(line);
    if (isHeaderLine(line, phones)) continue;
    if (phones.length === 0) {
      invalid.push({ raw: line, reason: "invalid" });
      continue;
    }
    const leftover = leftoverName(line);
    for (const phone of phones) {
      if (rows.length >= maxRows) {
        truncated = true;
        break;
      }
      if (seen.has(phone.e164)) {
        duplicates.push({ raw: phone.nationalDigits, reason: "duplicate" });
        continue;
      }
      seen.add(phone.e164);
      rows.push({
        name: displayName(phone, leftover),
        phone: phone.nationalDigits,
        e164: phone.e164,
      });
    }
    if (truncated) break;
  }

  return { rows, invalid, duplicates, truncated };
}
