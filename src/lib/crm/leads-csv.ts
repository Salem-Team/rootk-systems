import type { CrmLeadSource, CrmLeadStatus, CrmLeadTag } from "@/types/crm";

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

export function isCrmLeadRequiredField(field: CrmLeadCsvHeader): boolean {
  return field === "name" || field === "phone";
}

const HEADER_ALIASES: Record<string, CrmLeadCsvHeader> = {
  name: "name",
  lead: "name",
  "lead name": "name",
  fullname: "name",
  "full name": "name",
  customer: "name",
  "customer name": "name",
  اسم: "name",
  "اسم العميل": "name",
  "اسم الليد": "name",
  "الاسم": "name",
  phone: "phone",
  mobile: "phone",
  "mobile number": "phone",
  "phone number": "phone",
  tel: "phone",
  whatsapp: "phone",
  هاتف: "phone",
  موبايل: "phone",
  تليفون: "phone",
  "رقم الموبايل": "phone",
  "رقم الهاتف": "phone",
  "رقم الواتساب": "phone",
  email: "email",
  "e-mail": "email",
  mail: "email",
  ايميل: "email",
  إيميل: "email",
  "البريد": "email",
  "البريد الإلكتروني": "email",
  company: "companyName",
  companyname: "companyName",
  "company name": "companyName",
  organization: "companyName",
  شركة: "companyName",
  "اسم الشركة": "companyName",
  businesstype: "businessType",
  "business type": "businessType",
  industry: "businessType",
  "company type": "businessType",
  "نوع الشركة": "businessType",
  "نوع النشاط": "businessType",
  source: "source",
  "lead source": "source",
  مصدر: "source",
  المصدر: "source",
  stage: "stage",
  stagename: "stage",
  "stage name": "stage",
  pipeline: "stage",
  مرحلة: "stage",
  المرحلة: "stage",
  owner: "owner",
  sales: "owner",
  "sales owner": "owner",
  "owner email": "owner",
  "owner name": "owner",
  assignee: "owner",
  مسئول: "owner",
  المسؤول: "owner",
  المالك: "owner",
  "مسؤول المبيعات": "owner",
  status: "status",
  حالة: "status",
  الحالة: "status",
  tags: "tags",
  tag: "tags",
  labels: "tags",
  تاج: "tags",
  وسوم: "tags",
  nextaction: "nextAction",
  "next action": "nextAction",
  followup: "nextAction",
  "الإجراء التالي": "nextAction",
  "الخطوة التالية": "nextAction",
  notes: "notes",
  note: "notes",
  comment: "notes",
  comments: "notes",
  ملاحظات: "notes",
  ملاحظة: "notes",
};

export function normalizeLeadHeader(raw: string): string {
  return raw.replace(/^\uFEFF/, "").trim().toLowerCase().replace(/\s+/g, " ");
}

/** Map file column names → canonical lead fields (first match wins). */
export function suggestLeadColumnMapping(
  headers: string[]
): Partial<Record<CrmLeadCsvHeader, number>> {
  const mapping: Partial<Record<CrmLeadCsvHeader, number>> = {};
  const used = new Set<number>();
  headers.forEach((header, idx) => {
    const key = HEADER_ALIASES[normalizeLeadHeader(header)];
    if (!key || mapping[key] !== undefined || used.has(idx)) return;
    mapping[key] = idx;
    used.add(idx);
  });
  return mapping;
}

export function applyLeadColumnMapping(
  dataRows: string[][],
  mapping: Partial<Record<CrmLeadCsvHeader, number>>
): { rows: CrmLeadCsvRow[]; errors: string[] } {
  const errors: string[] = [];
  if (mapping.name === undefined || mapping.phone === undefined) {
    return {
      rows: [],
      errors: ["Spreadsheet must map name and phone columns"],
    };
  }

  const rows: CrmLeadCsvRow[] = [];
  dataRows.forEach((cells, offset) => {
    const rowNum = offset + 2;
    const read = (key: CrmLeadCsvHeader) => {
      const idx = mapping[key];
      if (idx === undefined) return "";
      return String(cells[idx] ?? "").trim();
    };
    const name = read("name");
    const phone = read("phone");
    if (!name && !phone) return;
    if (!name || !phone) {
      errors.push(`Row ${rowNum}: name and phone are required`);
      return;
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
  });
  return { rows, errors };
}

/** Unique sample values from a column (for mapping UI). */
export function sampleColumnValues(
  dataRows: string[][],
  columnIndex: number,
  limit = 3
): string[] {
  const seen = new Set<string>();
  const samples: string[] = [];
  for (const row of dataRows) {
    const value = String(row[columnIndex] ?? "").trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    samples.push(value);
    if (samples.length >= limit) break;
  }
  return samples;
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
