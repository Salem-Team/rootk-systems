import type { TechnicalProposalDocument } from "@/types/crm";

export const QUOTATION_PRICE_FIELDS = [
  { key: "listed", label: "السعر الحالي" },
  { key: "requested", label: "السعر المطلوب" },
  { key: "approved", label: "السعر المعتمد" },
] as const;

export type QuotationPriceKey = (typeof QUOTATION_PRICE_FIELDS)[number]["key"];

export function readQuotationPrices(
  doc: TechnicalProposalDocument
): Record<QuotationPriceKey, string> {
  const found: Partial<Record<QuotationPriceKey, string>> = {};
  for (const section of doc.sections) {
    for (const bullet of section.bullets) {
      const trimmed = bullet.trim();
      for (const field of QUOTATION_PRICE_FIELDS) {
        if (!trimmed.startsWith(field.label) || found[field.key]) continue;
        const value = trimmed
          .slice(field.label.length)
          .replace(/^[:：\-–\s]+/, "")
          .trim();
        found[field.key] = value === "—" ? "" : value;
      }
    }
  }
  return {
    listed: found.listed ?? "",
    requested: found.requested ?? "",
    approved: found.approved ?? "",
  };
}

export function isQuotationPriceBullet(bullet: string): boolean {
  const trimmed = bullet.trim();
  return QUOTATION_PRICE_FIELDS.some((field) => trimmed.startsWith(field.label));
}

export function writeQuotationPrice(
  doc: TechnicalProposalDocument,
  key: QuotationPriceKey,
  value: string
): TechnicalProposalDocument {
  const field = QUOTATION_PRICE_FIELDS.find((row) => row.key === key);
  if (!field) return doc;
  const nextValue = value.trim();
  const line = `${field.label}: ${nextValue || "—"}`;
  let replaced = false;
  const sections = doc.sections.map((section) => {
    const bullets = section.bullets.map((bullet) => {
      if (!bullet.trim().startsWith(field.label)) return bullet;
      replaced = true;
      return line;
    });
    return bullets === section.bullets ? section : { ...section, bullets };
  });
  if (replaced) return { ...doc, sections };

  if (sections.length === 0) {
    return {
      ...doc,
      sections: [
        {
          id: "price-request",
          title: "تفاصيل الطلب",
          intro: "",
          bullets: [line],
        },
      ],
    };
  }

  const [first, ...rest] = sections;
  return {
    ...doc,
    sections: [
      { ...first, bullets: [...first.bullets, line] },
      ...rest,
    ],
  };
}
