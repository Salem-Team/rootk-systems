import type { CrmLead, CrmLeadSource, CrmLeadStatus, CrmLeadTag } from "@/types/crm";
import { extractHandle, looksLikeHandle } from "@/lib/crm/contact-identity";
import {
  CRM_BUDGET_COMPACT,
  matchIndustryToken,
  matchProductToken,
  parseCrmBudget,
  parseCrmRequest,
} from "@/lib/crm/request-budget-presets";
import { canonicalPhoneOrNull, phoneSearchNeedles } from "@/lib/phone-normalize";

const SOURCE_LABELS: Record<CrmLeadSource, string[]> = {
  facebook: ["facebook", "فيسبوك", "فيس بوك"],
  instagram: ["instagram", "انستغرام", "إنستغرام", "انستجرام", "إنستجرام"],
  tiktok: ["tiktok", "تيك توك", "تيكتوك"],
  website: ["website", "الموقع", "ويب سايت"],
  whatsapp: ["whatsapp", "واتساب", "واتس اب", "واتس"],
  referral: ["referral", "إحالة", "احالة"],
  organic: ["organic", "عضوي"],
  advertisement: ["advertisement", "إعلان", "اعلان"],
  google: ["google", "جوجل"],
  chatgpt: ["chatgpt", "شات جي بي تي", "شات جي بي تي"],
  other: ["other", "أخرى", "اخرى"],
};

const STATUS_LABELS: Record<CrmLeadStatus, string[]> = {
  active: ["active", "نشط"],
  inactive: ["inactive", "غير نشط"],
  archived: ["archived", "مؤرشف", "ارشيف", "أرشيف"],
};

const TAG_LABELS: Record<CrmLeadTag, string[]> = {
  hot: ["hot", "ساخن"],
  warm: ["warm", "دافئ"],
  cold: ["cold", "بارد"],
  vip: ["vip"],
  high_budget: ["high_budget", "high budget", "ميزانية عالية"],
  follow_up: ["follow_up", "follow up", "متابعة"],
  interested: ["interested", "مهتم"],
};

/** Fold Arabic spelling variants so أحمد and احمد search the same. */
export function foldSearchText(value: string): string {
  return value
    .replace(/[\u064B-\u0652\u0670]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function labelHit(foldedQuery: string, labels: string[]): boolean {
  if (foldedQuery.length < 2) return false;
  return labels.some((label) => {
    const folded = foldSearchText(label);
    return (
      folded === foldedQuery ||
      (foldedQuery.length >= 3 && folded.startsWith(foldedQuery))
    );
  });
}

function phoneHit(stored: string, query: string): boolean {
  const needles = phoneSearchNeedles(query);
  if (needles.length === 0) return false;
  const digits = foldSearchText(stored).replace(/\D/g, "");
  if (!digits) return false;
  return needles.some((needle) => digits.includes(needle));
}

/** Compact table labels (`<50k`) match the saved Arabic/English budget text. */
export function budgetMatchesSearch(stored: string, query: string): boolean {
  const raw = stored.trim();
  const q = query.trim();
  if (!raw || !q) return false;
  const foldedStored = foldSearchText(raw);
  const foldedQuery = foldSearchText(q);
  if (foldedQuery && foldedStored.includes(foldedQuery)) return true;

  const parsed = parseCrmBudget(raw);
  if (!parsed.tier) return false;
  if (parsed.tier === "negotiable") {
    return labelHit(foldedQuery, [
      "حسب الاتفاق",
      "تحت التفاوض",
      "negotiable",
      "tbd",
    ]);
  }
  const compact = CRM_BUDGET_COMPACT[parsed.tier]
    .toLowerCase()
    .replace(/\s/g, "")
    .replace(/[–—]/g, "-");
  const normQuery = foldedQuery.replace(/\s/g, "").replace(/[–—]/g, "-");
  if (!normQuery || compact === "—" || compact === "…") return false;
  if (compact === normQuery) return true;
  return (
    normQuery.length >= 3 &&
    (compact.includes(normQuery) || normQuery.includes(compact))
  );
}

/** Product/industry chips match even when the query is the other language. */
export function requestMatchesSearch(stored: string, query: string): boolean {
  const raw = stored.trim();
  const q = query.trim();
  if (!raw || !q) return false;
  if (foldSearchText(raw).includes(foldSearchText(q))) return true;
  const parsed = parseCrmRequest(raw);
  const product = matchProductToken(q);
  if (product && parsed.products.includes(product)) return true;
  const industry = matchIndustryToken(q);
  if (industry && parsed.industries.includes(industry)) return true;
  return false;
}

function aliasHit(lead: CrmLead, foldedQuery: string): boolean {
  if (labelHit(foldedQuery, SOURCE_LABELS[lead.source] ?? [])) return true;
  if (labelHit(foldedQuery, STATUS_LABELS[lead.status] ?? [])) return true;
  return (lead.tags ?? []).some((tag) =>
    labelHit(foldedQuery, TAG_LABELS[tag] ?? [tag])
  );
}

/** True when the query matches this lead's name, phone, feedback text, budget, or other fields. */
export function leadMatchesSearch(
  lead: CrmLead,
  query: string,
  extraText = ""
): boolean {
  const q = query.trim();
  if (!q) return true;
  const foldedQuery = foldSearchText(q);
  const parts = [
    lead.name,
    lead.phone,
    lead.phoneNormalized ?? "",
    lead.email,
    lead.companyName,
    lead.id,
    lead.notes,
    lead.request,
    lead.budget,
    lead.source,
    lead.status,
    ...(lead.tags ?? []),
    extraText,
    ...(lead.contacts ?? []).flatMap((row) => [
      row.phone,
      row.phoneNormalized ?? "",
    ]),
  ];
  const hay = foldSearchText(parts.filter(Boolean).join(" \n "));
  if (foldedQuery && hay.includes(foldedQuery)) return true;

  const phones = [
    lead.phone,
    lead.phoneNormalized ?? "",
    ...(lead.contacts ?? []).flatMap((row) => [
      row.phone,
      row.phoneNormalized ?? "",
    ]),
  ];
  if (phones.some((value) => phoneHit(value, q))) return true;

  const canonical = canonicalPhoneOrNull(q);
  if (
    canonical &&
    (lead.phoneNormalized === canonical ||
      canonicalPhoneOrNull(lead.phone) === canonical ||
      (lead.contacts ?? []).some(
        (row) =>
          row.phoneNormalized === canonical ||
          canonicalPhoneOrNull(row.phone) === canonical
      ))
  ) {
    return true;
  }

  const handle = extractHandle(q);
  if (
    looksLikeHandle(q) &&
    handle &&
    hay.includes(foldSearchText(handle))
  ) {
    return true;
  }

  if (budgetMatchesSearch(lead.budget ?? "", q)) return true;
  if (requestMatchesSearch(lead.request ?? "", q)) return true;
  if (aliasHit(lead, foldedQuery)) return true;
  return false;
}
