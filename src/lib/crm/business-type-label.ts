import type { TranslationPath } from "@/i18n";

type BusinessTypeKey =
  | "technology"
  | "healthcare"
  | "education"
  | "retail"
  | "real_estate"
  | "manufacturing"
  | "finance"
  | "food"
  | "construction"
  | "logistics"
  | "marketing"
  | "tourism"
  | "agriculture"
  | "ecommerce"
  | "legal"
  | "energy"
  | "telecom"
  | "wholesale"
  | "professional"
  | "hospitality"
  | "other";

/** Stored catalog names (English seed or Arabic seed) → translation key. */
const BUSINESS_TYPE_ALIASES: Record<string, BusinessTypeKey> = {
  technology: "technology",
  تكنولوجيا: "technology",
  healthcare: "healthcare",
  "رعاية صحية": "healthcare",
  education: "education",
  تعليم: "education",
  retail: "retail",
  "تجارة التجزئة": "retail",
  "real estate": "real_estate",
  عقارات: "real_estate",
  manufacturing: "manufacturing",
  تصنيع: "manufacturing",
  finance: "finance",
  "تمويل وخدمات مالية": "finance",
  "food & beverage": "food",
  "أغذية ومشروبات": "food",
  construction: "construction",
  "مقاولات وبناء": "construction",
  "خدمات لوجستية": "logistics",
  "تسويق وإعلان": "marketing",
  "سياحة وفنادق": "tourism",
  زراعة: "agriculture",
  "تجارة إلكترونية": "ecommerce",
  "خدمات قانونية": "legal",
  طاقة: "energy",
  اتصالات: "telecom",
  "تجارة الجملة": "wholesale",
  "خدمات مهنية": "professional",
  "مطاعم وضيافة": "hospitality",
  other: "other",
  أخرى: "other",
};

function aliasKey(name: string): BusinessTypeKey | null {
  const trimmed = name.trim();
  return (
    BUSINESS_TYPE_ALIASES[trimmed] ??
    BUSINESS_TYPE_ALIASES[trimmed.toLowerCase()] ??
    null
  );
}

/** Label a lead company type in the active locale. Custom names stay as stored. */
export function businessTypeLabel(
  name: string,
  t: (path: TranslationPath) => string
): string {
  const key = aliasKey(name);
  if (!key) return name;
  return t(`crm.businessTypeOptions.${key}`);
}
