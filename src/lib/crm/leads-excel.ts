import type { WorkBook, WorkSheet } from "xlsx";
import {
  CRM_LEAD_CSV_HEADERS,
  type CrmLeadCsvHeader,
} from "@/lib/crm/leads-csv";

type XlsxNs = typeof import("xlsx");

let xlsxPromise: Promise<XlsxNs> | null = null;

/** Load xlsx only when import/export actually runs — keeps it out of the CRM hub chunk. */
function loadXlsx(): Promise<XlsxNs> {
  if (!xlsxPromise) xlsxPromise = import("xlsx");
  return xlsxPromise;
}

const LEADS_SHEET_NAMES = new Set(["leads", "lead", "data", "العملاء", "ليدز"]);
const MAPPING_SHEET_NAMES = new Set([
  "mapping",
  "field mapping",
  "fields",
  "الخريطة",
  "التعيين",
  "الحقول",
]);

const SAMPLE_LEAD_ROW = [
  "Ahmed Hassan",
  "+201000000001",
  "ahmed@example.com",
  "Acme Co",
  "Cairo · Nasr City",
  "Retail",
  "website",
  "New Lead",
  "",
  "active",
  "hot;interested",
  "call",
  "ERP pricing",
  "50k",
  "Imported sample",
];

const FIELD_GUIDE: Array<{
  field: CrmLeadCsvHeader;
  required: boolean;
  ar: string;
  en: string;
  example: string;
  values: string;
}> = [
  {
    field: "name",
    required: true,
    ar: "اسم العميل",
    en: "Lead name",
    example: "Ahmed Hassan",
    values: "",
  },
  {
    field: "phone",
    required: true,
    ar: "رقم الموبايل",
    en: "Phone (text format)",
    example: "+201000000001",
    values: "",
  },
  {
    field: "email",
    required: false,
    ar: "البريد",
    en: "Email",
    example: "ahmed@example.com",
    values: "",
  },
  {
    field: "companyName",
    required: false,
    ar: "اسم الشركة",
    en: "Company name",
    example: "Acme Co",
    values: "",
  },
  {
    field: "companyLocation",
    required: false,
    ar: "لوكيشن الشركة",
    en: "Company location",
    example: "Cairo · Nasr City",
    values: "",
  },
  {
    field: "businessType",
    required: false,
    ar: "نوع النشاط",
    en: "Business type (name as in CRM)",
    example: "Retail",
    values: "",
  },
  {
    field: "source",
    required: false,
    ar: "المصدر",
    en: "Lead source",
    example: "website",
    values:
      "facebook, instagram, tiktok, website, whatsapp, referral, organic, advertisement, other",
  },
  {
    field: "stage",
    required: false,
    ar: "المرحلة",
    en: "Stage name as in CRM",
    example: "New Lead",
    values: "",
  },
  {
    field: "owner",
    required: false,
    ar: "مسؤول المبيعات",
    en: "Owner name or email",
    example: "",
    values: "",
  },
  {
    field: "status",
    required: false,
    ar: "الحالة",
    en: "Status",
    example: "active",
    values: "active, inactive, archived",
  },
  {
    field: "tags",
    required: false,
    ar: "الوسوم",
    en: "Tags (semicolon-separated)",
    example: "hot;interested",
    values: "hot, warm, cold, vip, high_budget, follow_up, interested",
  },
  {
    field: "nextAction",
    required: false,
    ar: "الإجراء التالي",
    en: "Next action",
    example: "call",
    values: "call, whatsapp, email, meeting, follow_up, send_proposal, none",
  },
  {
    field: "request",
    required: false,
    ar: "الطلب",
    en: "Request / interest",
    example: "ERP pricing",
    values: "",
  },
  {
    field: "budget",
    required: false,
    ar: "البادجيت",
    en: "Budget",
    example: "50k",
    values: "",
  },
  {
    field: "notes",
    required: false,
    ar: "ملاحظات",
    en: "Notes",
    example: "Imported sample",
    values: "",
  },
];

export interface CrmLeadSpreadsheet {
  sheetName: string;
  headers: string[];
  dataRows: string[][];
}

function cellToString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value).trim();
}

function isMappingSheet(name: string): boolean {
  return MAPPING_SHEET_NAMES.has(name.trim().toLowerCase());
}

function pickLeadsSheet(wb: WorkBook): string {
  const names = wb.SheetNames.filter((name) => !isMappingSheet(name));
  const preferred = names.find((name) =>
    LEADS_SHEET_NAMES.has(name.trim().toLowerCase())
  );
  return preferred ?? names[0] ?? wb.SheetNames[0] ?? "";
}

function sheetToRows(XLSX: XlsxNs, sheet: WorkSheet): string[][] {
  const raw = XLSX.utils.sheet_to_json<(string | number | boolean | Date)[]>(
    sheet,
    {
      header: 1,
      raw: false,
      defval: "",
      blankrows: false,
    }
  );
  return raw
    .map((row) =>
      (Array.isArray(row) ? row : []).map((cell) => cellToString(cell))
    )
    .filter((row) => row.some((cell) => cell.length > 0));
}

function workbookToSpreadsheet(
  XLSX: XlsxNs,
  wb: WorkBook
): CrmLeadSpreadsheet {
  const sheetName = pickLeadsSheet(wb);
  if (!sheetName || !wb.Sheets[sheetName]) {
    throw new Error("Workbook has no data sheet");
  }
  const rows = sheetToRows(XLSX, wb.Sheets[sheetName]);
  const headers = (rows[0] ?? []).map((h) => h.replace(/^\uFEFF/, "").trim());
  return {
    sheetName,
    headers,
    dataRows: rows.slice(1),
  };
}

export async function parseCrmLeadsSpreadsheet(
  buffer: ArrayBuffer
): Promise<CrmLeadSpreadsheet> {
  const XLSX = await loadXlsx();
  return workbookToSpreadsheet(
    XLSX,
    XLSX.read(buffer, { type: "array", cellDates: false })
  );
}

export async function parseCrmLeadsFile(file: File): Promise<CrmLeadSpreadsheet> {
  const XLSX = await loadXlsx();
  const isCsv =
    file.name.toLowerCase().endsWith(".csv") ||
    file.type.includes("csv");
  if (isCsv) {
    return workbookToSpreadsheet(
      XLSX,
      XLSX.read(await file.text(), { type: "string" })
    );
  }
  return parseCrmLeadsSpreadsheet(await file.arrayBuffer());
}

function mappingGuideSheet(XLSX: XlsxNs): WorkSheet {
  const aoa: (string | number)[][] = [
    [
      "field",
      "required",
      "label_ar",
      "label_en",
      "example",
      "allowed_values",
    ],
    ...FIELD_GUIDE.map((row) => [
      row.field,
      row.required ? "yes" : "no",
      row.ar,
      row.en,
      row.example,
      row.values,
    ]),
  ];
  return XLSX.utils.aoa_to_sheet(aoa);
}

export async function buildCrmLeadsWorkbook(
  leadRows: (string | number)[][]
): Promise<WorkBook> {
  const XLSX = await loadXlsx();
  const wb = XLSX.utils.book_new();
  const leadsSheet = XLSX.utils.aoa_to_sheet(leadRows);
  leadsSheet["!cols"] = CRM_LEAD_CSV_HEADERS.map((header) => ({
    wch: Math.min(28, Math.max(12, header.length + 4)),
  }));
  XLSX.utils.book_append_sheet(wb, leadsSheet, "Leads");
  XLSX.utils.book_append_sheet(wb, mappingGuideSheet(XLSX), "Mapping");
  return wb;
}

export async function crmLeadExcelTemplate(): Promise<WorkBook> {
  return buildCrmLeadsWorkbook([[...CRM_LEAD_CSV_HEADERS], SAMPLE_LEAD_ROW]);
}

export async function downloadCrmLeadsWorkbook(
  filename: string,
  records: Array<Record<string, string>>
): Promise<void> {
  const XLSX = await loadXlsx();
  const header = [...CRM_LEAD_CSV_HEADERS];
  const body = records.map((row) => header.map((key) => row[key] ?? ""));
  XLSX.writeFile(await buildCrmLeadsWorkbook([header, ...body]), filename);
}

export async function downloadCrmLeadsTemplate(
  filename = "crm-leads-template.xlsx"
): Promise<void> {
  const XLSX = await loadXlsx();
  XLSX.writeFile(await crmLeadExcelTemplate(), filename);
}
