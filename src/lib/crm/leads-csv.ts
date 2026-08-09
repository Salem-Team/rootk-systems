import type { CrmLead, CrmLeadSource, CrmLeadStatus, CrmLeadTag } from "@/types/crm";

/** Canonical CSV headers for CRM lead import/export. */
export const CRM_LEAD_CSV_HEADERS = [
  "name",
  "phone",
  "email",
  "companyName",
  "businessType",
  "source",
  "stage",
  "owner",
  "status",
  "tags",
  "nextAction",
  "notes",
] as const;

export type CrmLeadCsvHeader = (typeof CRM_LEAD_CSV_HEADERS)[number];

export interface CrmLeadCsvRow {
  name: string;
  phone: string;
  email: string;
  companyName: string;
  businessType: string;
  source: string;
  stage: string;
  owner: string;
  status: string;
  tags: string;
  nextAction: string;
  notes: string;
}

const HEADER_ALIASES: Record<string, CrmLeadCsvHeader> = {
  name: "name",
  lead: "name",
  "lead name": "name",
  phone: "phone",
  mobile: "phone",
  email: "email",
  company: "companyName",
  companyname: "companyName",
  "company name": "companyName",
  businesstype: "businessType",
  "business type": "businessType",
  industry: "businessType",
  "company type": "businessType",
  source: "source",
  stage: "stage",
  stagename: "stage",
  "stage name": "stage",
  owner: "owner",
  sales: "owner",
  "owner email": "owner",
  "owner name": "owner",
  status: "status",
  tags: "tags",
  nextaction: "nextAction",
  "next action": "nextAction",
  notes: "notes",
  note: "notes",
};

function normalizeHeader(raw: string): string {
  return raw.replace(/^\uFEFF/, "").trim().toLowerCase();
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

/** Parse CSV text into normalized lead rows (skips blank lines). */
export function parseCrmLeadsCsv(text: string): {
  rows: CrmLeadCsvRow[];
  errors: string[];
} {
  const errors: string[] = [];
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    return { rows: [], errors: ["CSV is empty"] };
  }

  const headerCells = splitCsvLine(lines[0]).map(normalizeHeader);
  const indexMap = new Map<CrmLeadCsvHeader, number>();
  headerCells.forEach((cell, idx) => {
    const key = HEADER_ALIASES[cell];
    if (key) indexMap.set(key, idx);
  });
  if (!indexMap.has("name") || !indexMap.has("phone")) {
    return {
      rows: [],
      errors: ["CSV must include name and phone columns"],
    };
  }

  const rows: CrmLeadCsvRow[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cells = splitCsvLine(lines[i]);
    const read = (key: CrmLeadCsvHeader) => {
      const idx = indexMap.get(key);
      return idx === undefined ? "" : String(cells[idx] ?? "").trim();
    };
    const name = read("name");
    const phone = read("phone");
    if (!name && !phone) continue;
    if (!name || !phone) {
      errors.push(`Row ${i + 1}: name and phone are required`);
      continue;
    }
    rows.push({
      name,
      phone,
      email: read("email"),
      companyName: read("companyName"),
      businessType: read("businessType"),
      source: read("source"),
      stage: read("stage"),
      owner: read("owner"),
      status: read("status"),
      tags: read("tags"),
      nextAction: read("nextAction"),
      notes: read("notes"),
    });
  }
  return { rows, errors };
}

export function crmLeadCsvTemplate(): string {
  const sample = [
    CRM_LEAD_CSV_HEADERS.join(","),
    [
      "Ahmed Hassan",
      "+201000000001",
      "ahmed@example.com",
      "Acme Co",
      "Retail",
      "website",
      "New Lead",
      "",
      "active",
      "hot;interested",
      "call",
      "Imported sample",
    ]
      .map((v) => `"${v}"`)
      .join(","),
  ].join("\n");
  return `\uFEFF${sample}\n`;
}

export function leadsToCsvRows(
  leads: CrmLead[],
  stageNameById: Map<string, string>,
  ownerNameById: Map<string, string>,
  businessTypeNameById: Map<string, string> = new Map()
): (string | number)[][] {
  const header = [...CRM_LEAD_CSV_HEADERS];
  const body = leads.map((lead) => [
    lead.name,
    lead.phone,
    lead.email ?? "",
    lead.companyName ?? "",
    lead.businessTypeId
      ? businessTypeNameById.get(lead.businessTypeId) ?? lead.businessTypeId
      : "",
    lead.source,
    stageNameById.get(lead.stageId) ?? lead.stageId,
    lead.ownerEmployeeId
      ? ownerNameById.get(lead.ownerEmployeeId) ?? lead.ownerEmployeeId
      : "",
    lead.status,
    (lead.tags ?? []).join(";"),
    lead.nextAction ?? "none",
    lead.notes ?? "",
  ]);
  return [header, ...body];
}

export function parseTagsCell(value: string): CrmLeadTag[] {
  if (!value.trim()) return [];
  const allowed = new Set<CrmLeadTag>([
    "hot",
    "warm",
    "cold",
    "vip",
    "high_budget",
    "follow_up",
    "interested",
  ]);
  return value
    .split(/[|;,]/)
    .map((t) => t.trim().toLowerCase().replace(/\s+/g, "_"))
    .filter((t): t is CrmLeadTag => allowed.has(t as CrmLeadTag));
}

export function normalizeSource(value: string): CrmLeadSource {
  const v = value.trim().toLowerCase();
  const allowed: CrmLeadSource[] = [
    "facebook",
    "instagram",
    "tiktok",
    "website",
    "whatsapp",
    "referral",
    "organic",
    "advertisement",
    "other",
  ];
  return (allowed.find((s) => s === v) ?? "other") as CrmLeadSource;
}

export function normalizeStatus(value: string): CrmLeadStatus {
  const v = value.trim().toLowerCase();
  if (v === "inactive" || v === "archived" || v === "active") return v;
  return "active";
}
