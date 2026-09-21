/** Preset chips for quick CRM request + budget capture. */

export const CRM_REQUEST_PRODUCTS = [
  "erp",
  "crm",
  "accounting",
  "hr",
  "mobile_app",
  "attendance",
  "daily_plan",
  "tasks",
  "targets",
  "leave",
  "payroll",
  "reports",
  "website",
  "pos",
  "ecommerce",
  "inventory",
  "marketing",
  "call_center",
  "school",
  "clinic",
  "custom_software",
  "bi",
] as const;

export type CrmRequestProduct = (typeof CRM_REQUEST_PRODUCTS)[number];

export const CRM_REQUEST_INDUSTRIES = [
  "manufacturing",
  "trading",
  "services",
  "healthcare",
  "education",
  "real_estate",
  "retail",
  "logistics",
  "construction",
  "restaurants",
  "technology",
  "finance",
  "food",
  "tourism",
  "agriculture",
  "legal",
  "energy",
  "telecom",
  "ecommerce",
  "marketing",
] as const;

export type CrmRequestIndustry = (typeof CRM_REQUEST_INDUSTRIES)[number];

export const CRM_BUDGET_TIERS = [
  "under_50k",
  "50_100k",
  "100_250k",
  "250_500k",
  "over_500k",
  "negotiable",
] as const;

export type CrmBudgetTier = (typeof CRM_BUDGET_TIERS)[number];

const PRODUCT_SET = new Set<string>(CRM_REQUEST_PRODUCTS);
const INDUSTRY_SET = new Set<string>(CRM_REQUEST_INDUSTRIES);
const TIER_SET = new Set<string>(CRM_BUDGET_TIERS);

export type ParsedCrmRequest = {
  products: CrmRequestProduct[];
  industries: CrmRequestIndustry[];
  notes: string;
};

export type ParsedCrmBudget = {
  tier: CrmBudgetTier | null;
  custom: string;
};

const REQUEST_MARKERS = {
  products: ["المنتج:", "Products:"],
  industries: ["المجال:", "Industry:"],
  notes: ["تفاصيل:", "Details:"],
} as const;

function splitLabeled(text: string, labels: readonly string[]): string | null {
  for (const label of labels) {
    const idx = text.indexOf(label);
    if (idx === -1) continue;
    const after = text.slice(idx + label.length);
    const nextMarkers = [
      ...REQUEST_MARKERS.products,
      ...REQUEST_MARKERS.industries,
      ...REQUEST_MARKERS.notes,
    ].filter((m) => m !== label);
    let end = after.length;
    for (const m of nextMarkers) {
      const at = after.indexOf(m);
      if (at !== -1 && at < end) end = at;
    }
    return after.slice(0, end).trim();
  }
  return null;
}

/** Hydrate chips from a previously composed (or free-text) request. */
export function parseCrmRequest(raw: string): ParsedCrmRequest {
  const text = raw.trim();
  if (!text) return { products: [], industries: [], notes: "" };

  const productsRaw = splitLabeled(text, REQUEST_MARKERS.products);
  const industriesRaw = splitLabeled(text, REQUEST_MARKERS.industries);
  const notesRaw = splitLabeled(text, REQUEST_MARKERS.notes);

  if (productsRaw == null && industriesRaw == null && notesRaw == null) {
    const lower = text.toLowerCase();
    const products = CRM_REQUEST_PRODUCTS.filter((p) => {
      if (p === "mobile_app") {
        return /mobile\s*app|موبايل|تطبيق/.test(lower);
      }
      if (p.length <= 3) return new RegExp(`\\b${p}\\b`, "i").test(text);
      return lower.includes(p);
    });
    return { products, industries: [], notes: text };
  }

  const products = (productsRaw ?? "")
    .split(/[،,|/]+/)
    .map((s) => matchProductToken(s))
    .filter((s): s is CrmRequestProduct => s != null);

  const industries = (industriesRaw ?? "")
    .split(/[،,|/]+/)
    .map((s) => matchIndustryToken(s))
    .filter((s): s is CrmRequestIndustry => s != null);

  return {
    products: [...new Set(products)],
    industries: [...new Set(industries)],
    notes: (notesRaw ?? "").trim(),
  };
}

/** Build a readable request string from chips + optional notes. */
export function composeCrmRequest(
  products: CrmRequestProduct[],
  industries: CrmRequestIndustry[],
  notes: string,
  locale: "ar" | "en",
  labelForProduct: (id: CrmRequestProduct) => string,
  labelForIndustry: (id: CrmRequestIndustry) => string
): string {
  const lines: string[] = [];
  const productLabel = locale === "ar" ? "المنتج:" : "Products:";
  const industryLabel = locale === "ar" ? "المجال:" : "Industry:";
  const notesLabel = locale === "ar" ? "تفاصيل:" : "Details:";
  const sep = locale === "ar" ? "، " : ", ";

  if (products.length) {
    lines.push(
      `${productLabel} ${products.map(labelForProduct).join(sep)}`
    );
  }
  if (industries.length) {
    lines.push(
      `${industryLabel} ${industries.map(labelForIndustry).join(sep)}`
    );
  }
  const trimmed = notes.trim();
  if (trimmed) {
    lines.push(`${notesLabel} ${trimmed}`);
  }
  return lines.join("\n");
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

/** Resolve a free-text product token (id or common label) to a preset id. */
export function matchProductToken(token: string): CrmRequestProduct | null {
  const n = normalizeToken(token);
  if (PRODUCT_SET.has(n)) return n as CrmRequestProduct;
  const aliases: Record<string, CrmRequestProduct> = {
    mobile_app: "mobile_app",
    mobile: "mobile_app",
    app: "mobile_app",
    موبايل: "mobile_app",
    تطبيق: "mobile_app",
    تطبيق_موبايل: "mobile_app",
    mobbile_app: "mobile_app",
    محاسبة: "accounting",
    حسابات: "accounting",
    accounts: "accounting",
    موقع: "website",
    موقع_إلكتروني: "website",
    إدارة_العملاء: "crm",
    موارد_بشرية: "hr",
    نظام_إدارة: "erp",
    حضور: "attendance",
    الحضور: "attendance",
    الخطة_اليومية: "daily_plan",
    "خطة_يومية": "daily_plan",
    المهام: "tasks",
    التارجتس: "targets",
    تارجتس: "targets",
    الإجازات: "leave",
    اجازات: "leave",
    التقارير: "reports",
    تقارير: "reports",
    نقاط_البيع: "pos",
    تجارة_إلكترونية: "ecommerce",
    مخزون: "inventory",
    تسويق: "marketing",
    كول_سنتر: "call_center",
    مرتبات: "payroll",
    الرواتب: "payroll",
    نظام_مدارس: "school",
    نظام_عيادات: "clinic",
    برنامج_مخصص: "custom_software",
    تقارير_ولوحات: "bi",
    "e-commerce": "ecommerce",
    ecommerce: "ecommerce",
    inventory: "inventory",
    marketing: "marketing",
    payroll: "payroll",
    call_center: "call_center",
    attendance: "attendance",
    daily_plan: "daily_plan",
    tasks: "tasks",
    targets: "targets",
    leave: "leave",
    reports: "reports",
  };
  return aliases[n] ?? null;
}

/** Resolve a free-text industry token to a preset id. */
export function matchIndustryToken(token: string): CrmRequestIndustry | null {
  const n = normalizeToken(token);
  if (INDUSTRY_SET.has(n)) return n as CrmRequestIndustry;
  const aliases: Record<string, CrmRequestIndustry> = {
    تصنيع: "manufacturing",
    تجارة: "trading",
    تجارة_الجملة: "trading",
    خدمات: "services",
    رعاية_صحية: "healthcare",
    تعليم: "education",
    عقارات: "real_estate",
    realestate: "real_estate",
    تجزئة: "retail",
    تجارة_التجزئة: "retail",
    لوجستيات: "logistics",
    خدمات_لوجستية: "logistics",
    مقاولات: "construction",
    مقاولات_وبناء: "construction",
    مطاعم: "restaurants",
    مطاعم_وضيافة: "restaurants",
    تكنولوجيا: "technology",
    تمويل: "finance",
    تمويل_وخدمات_مالية: "finance",
    أغذية_ومشروبات: "food",
    سياحة_وفنادق: "tourism",
    زراعة: "agriculture",
    خدمات_قانونية: "legal",
    طاقة: "energy",
    اتصالات: "telecom",
    تجارة_إلكترونية: "ecommerce",
    تسويق_وإعلان: "marketing",
  };
  return aliases[n] ?? null;
}

const BUDGET_TIER_MARKERS: Record<CrmBudgetTier, string[]> = {
  under_50k: ["under_50k", "أقل من 50", "under 50k", "under 50"],
  "50_100k": ["50_100k", "50–100 ألف", "50–100k", "50-100", "50 — 100"],
  "100_250k": ["100_250k", "100–250 ألف", "100–250k", "100-250"],
  "250_500k": ["250_500k", "250–500 ألف", "250–500k", "250-500"],
  over_500k: [
    "over_500k",
    "أكتر من 500",
    "أكثر من 500",
    "500k+",
    "over 500",
  ],
  negotiable: [
    "negotiable",
    "حسب الاتفاق",
    "تحت التفاوض",
    "tbd",
    "negotiat",
  ],
};

/** Match saved budget text to a tier, else treat as custom. */
export function parseCrmBudget(raw: string): ParsedCrmBudget {
  const text = raw.trim();
  if (!text) return { tier: null, custom: "" };

  if (text.startsWith("custom:")) {
    return { tier: null, custom: text.slice("custom:".length).trim() };
  }

  if (TIER_SET.has(text)) {
    return { tier: text as CrmBudgetTier, custom: "" };
  }

  const lower = text.toLowerCase();
  for (const tier of CRM_BUDGET_TIERS) {
    if (BUDGET_TIER_MARKERS[tier].some((m) => lower.includes(m.toLowerCase()))) {
      return { tier, custom: "" };
    }
  }

  return { tier: null, custom: text };
}

export function composeCrmBudget(
  tier: CrmBudgetTier | null,
  custom: string,
  labelForTier: (tier: CrmBudgetTier) => string
): string {
  if (tier) return labelForTier(tier);
  return custom.trim();
}

/** Short numeric-style budget for dense tables (e.g. `<50k`, `100–250k`). */
export const CRM_BUDGET_COMPACT: Record<CrmBudgetTier, string> = {
  under_50k: "<50k",
  "50_100k": "50–100k",
  "100_250k": "100–250k",
  "250_500k": "250–500k",
  over_500k: "500k+",
  negotiable: "—",
};

/** Compact budget cell value for leads lists. */
export function formatBudgetCompact(raw: string): string {
  const parsed = parseCrmBudget(raw);
  if (parsed.tier) {
    if (parsed.tier === "negotiable") return "…";
    return CRM_BUDGET_COMPACT[parsed.tier];
  }
  const custom = parsed.custom.trim();
  if (!custom) return "";

  const digits = custom.replace(/[^\d.]/g, "");
  if (digits) {
    const n = Number(digits);
    if (Number.isFinite(n) && n > 0) {
      if (n >= 1000) {
        const k = n / 1000;
        return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
      }
      return String(n);
    }
  }

  return custom.length > 14 ? `${custom.slice(0, 12)}…` : custom;
}

/** One-line request preview: products first, then notes snippet. */
export function formatRequestCompact(
  raw: string,
  labelForProduct?: (id: CrmRequestProduct) => string
): string {
  const parsed = parseCrmRequest(raw);
  const parts: string[] = [];

  if (parsed.products.length) {
    parts.push(
      parsed.products
        .map((p) => (labelForProduct ? labelForProduct(p) : p.toUpperCase()))
        .join(" · ")
    );
  }

  const notes = parsed.notes.trim();
  if (notes) {
    const snippet = notes.length > 42 ? `${notes.slice(0, 40)}…` : notes;
    parts.push(snippet);
  }

  if (parts.length) return parts.join(" — ");

  const fallback = raw.trim().replace(/\s+/g, " ");
  if (!fallback) return "";
  return fallback.length > 48 ? `${fallback.slice(0, 46)}…` : fallback;
}
