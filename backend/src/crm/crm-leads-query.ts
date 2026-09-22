/** Pure Prisma where-clause builder for lead listing/filtering. */
import {
  CrmLeadSource,
  CrmLeadStatus,
  CrmRecordType,
  type Prisma,
} from "@prisma/client";
import { endOfDay } from "date-fns";
import { isAdminRole } from "../common/roles";
import type { Actor } from "./crm-access";
import { LEAD_SOURCES, LEAD_STATUSES } from "./crm-input";
import { CrmSharedService } from "./crm-shared.service";
import { extractHandle, looksLikeHandle } from "../lib/contact-identity";
import { phoneSearchNeedles } from "../lib/phone-normalize";
import { searchCanonicalFromQuery } from "./crm-phone";

/** Default keeps cold-call rows out of pipeline lead totals. */
export function resolveRecordTypeFilter(
  value?: string | null
): CrmRecordType {
  return value === "cold_call" ? CrmRecordType.cold_call : CrmRecordType.lead;
}

export function buildLeadWhere(
  shared: CrmSharedService,
  companyId: string,
  actor: Actor,
  query: Record<string, string | undefined>,
  ownerIds: string[] | null
): Prisma.CrmLeadWhereInput {
  const where: Prisma.CrmLeadWhereInput = {
    companyId,
    recordType: resolveRecordTypeFilter(query.recordType),
    ...shared.scopeOwnerFilter(actor, ownerIds),
    ...deletedLeadVisibility(actor, query),
  };

  if (query.search?.trim()) {
    where.OR = buildLeadSearchOr(query.search.trim());
  }
  if (query.stageId) where.stageId = query.stageId;
  if (query.subStageId) where.subStageId = query.subStageId;
  if (
    query.status &&
    query.status !== "deleted" &&
    LEAD_STATUSES.has(query.status)
  ) {
    where.status = query.status as CrmLeadStatus;
  }
  if (query.source && LEAD_SOURCES.has(query.source)) {
    where.source = query.source as CrmLeadSource;
  }
  if (query.ownerEmployeeId) {
    Object.assign(where, shared.extraOwnerFilter(ownerIds, query.ownerEmployeeId));
  }
  if (query.tag) where.tags = { has: query.tag };

  const now = new Date();
  const endToday = endOfDay(now);
  if (query.followUp === "today") {
    // Still due later today (not yet past the scheduled minute).
    where.nextFollowUpAt = { gt: now, lte: endToday };
  } else if (query.followUp === "upcoming") {
    where.nextFollowUpAt = { gt: endToday };
  } else if (query.followUp === "overdue") {
    // Delay face: scheduled next-action time has already passed.
    where.nextFollowUpAt = { lte: now };
    if (!query.status) where.status = CrmLeadStatus.active;
  } else if (query.followUp === "none") {
    where.nextFollowUpAt = null;
  }

  return where;
}

/**
 * Soft-deleted leads stay in the database.
 * Only an admin can list them (`status=deleted`) or find them via search.
 */
function deletedLeadVisibility(
  actor: Actor,
  query: Record<string, string | undefined>
): Prisma.CrmLeadWhereInput {
  const wantsDeleted = query.status === "deleted";
  if (wantsDeleted) {
    if (!isAdminRole(actor.role)) return { id: { in: [] } };
    return { deletedAt: { not: null } };
  }
  const adminSearch =
    isAdminRole(actor.role) && !query.status && Boolean(query.search?.trim());
  if (adminSearch) return {};
  return { deletedAt: null };
}

const TEXT_FIELDS = [
  "name",
  "email",
  "companyName",
  "companyLocation",
  "notes",
  "request",
  "budget",
] as const;

const SOURCE_LABELS: Record<string, string[]> = {
  facebook: ["facebook", "فيسبوك", "فيس بوك"],
  instagram: ["instagram", "انستغرام", "إنستغرام", "انستجرام"],
  tiktok: ["tiktok", "تيك توك", "تيكتوك"],
  website: ["website", "الموقع"],
  whatsapp: ["whatsapp", "واتساب", "واتس"],
  referral: ["referral", "إحالة", "احالة"],
  organic: ["organic", "عضوي"],
  advertisement: ["advertisement", "إعلان", "اعلان"],
  google: ["google", "جوجل"],
  chatgpt: ["chatgpt", "شات جي بي تي"],
  other: ["other", "أخرى", "اخرى"],
};

const STATUS_LABELS: Record<CrmLeadStatus, string[]> = {
  active: ["active", "نشط"],
  inactive: ["inactive", "غير نشط"],
  archived: ["archived", "مؤرشف", "ارشيف"],
};

const TAG_LABELS: Record<string, string[]> = {
  hot: ["hot", "ساخن"],
  warm: ["warm", "دافئ"],
  cold: ["cold", "بارد"],
  vip: ["vip"],
  high_budget: ["high budget", "ميزانية عالية"],
  follow_up: ["follow up", "متابعة"],
  interested: ["interested", "مهتم"],
};

function foldSearchText(value: string): string {
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

/** A few Arabic spelling variants so أحمد matches احمد in Postgres contains. */
function searchTextVariants(raw: string): string[] {
  const trimmed = raw.trim();
  const folded = foldSearchText(trimmed);
  const chars = [...folded];
  const positions: number[] = [];
  chars.forEach((ch, index) => {
    if (ch === "ا" || ch === "ه" || ch === "ي") positions.push(index);
  });
  const options = (ch: string): string[] => {
    if (ch === "ا") return ["ا", "أ", "إ", "آ"];
    if (ch === "ه") return ["ه", "ة"];
    if (ch === "ي") return ["ي", "ى"];
    return [ch];
  };
  let rows: string[][] = [chars];
  for (const pos of positions.slice(0, 2)) {
    const next: string[][] = [];
    for (const row of rows) {
      for (const ch of options(row[pos] ?? "")) {
        const copy = row.slice();
        copy[pos] = ch;
        next.push(copy);
      }
    }
    rows = next;
  }
  return [...new Set([trimmed, folded, ...rows.map((row) => row.join(""))])].filter(
    Boolean
  );
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

/** Compact budget chips (`<50k`) → fragments stored on the lead. */
function budgetSearchFragments(query: string): string[] {
  const q = foldSearchText(query).replace(/\s/g, "").replace(/[–—]/g, "-");
  if (q.length < 3) return [];
  const table: Array<[string[], string[]]> = [
    [["<50k", "under50k", "under50", "under_50k"], ["أقل من 50", "under 50", "under_50k"]],
    [["50-100k", "50_100k", "50-100"], ["50–100", "50-100"]],
    [["100-250k", "100_250k", "100-250"], ["100–250", "100-250"]],
    [["250-500k", "250_500k", "250-500"], ["250–500", "250-500"]],
    [["500k+", "over500", "over_500k"], ["أكتر من 500", "أكثر من 500", "over 500"]],
    [["negotiable", "حسبالاتفاق", "تحتالتفاوض", "tbd"], ["حسب الاتفاق", "تحت التفاوض", "negotiable"]],
  ];
  const fragments: string[] = [];
  for (const [keys, stored] of table) {
    const hit = keys.some((key) => {
      const norm = foldSearchText(key).replace(/\s/g, "").replace(/[–—]/g, "-");
      return norm === q || (q.length >= norm.length && q.includes(norm));
    });
    if (hit) fragments.push(...stored);
  }
  return fragments;
}

function buildLeadSearchOr(raw: string): Prisma.CrmLeadWhereInput[] {
  const variants = searchTextVariants(raw);
  const folded = foldSearchText(raw);
  const or: Prisma.CrmLeadWhereInput[] = [];

  for (const field of TEXT_FIELDS) {
    for (const variant of variants) {
      or.push({ [field]: { contains: variant, mode: "insensitive" } });
    }
  }

  for (const fragment of budgetSearchFragments(raw)) {
    or.push({ budget: { contains: fragment, mode: "insensitive" } });
  }

  const canonical = searchCanonicalFromQuery(raw);
  if (canonical) {
    or.push({ phoneNormalized: canonical });
    or.push({
      metadata: { path: ["contactKeys"], array_contains: canonical },
    });
  }
  for (const needle of phoneSearchNeedles(raw)) {
    or.push({ phoneNormalized: { contains: needle, mode: "insensitive" } });
    or.push({ phone: { contains: needle, mode: "insensitive" } });
    or.push({
      metadata: { path: ["contactSearch"], string_contains: needle },
    });
  }
  const handle = extractHandle(raw);
  if (looksLikeHandle(raw) && handle) {
    or.push({
      phoneNormalized: { contains: `:${handle}`, mode: "insensitive" },
    });
    or.push({ phone: { contains: handle, mode: "insensitive" } });
  }
  for (const variant of variants) {
    or.push({
      metadata: {
        path: ["contactSearch"],
        string_contains: variant.toLowerCase(),
      },
    });
  }

  const feedbackText = variants.flatMap((variant) => [
    { customerFeedback: { contains: variant, mode: "insensitive" as const } },
    { notes: { contains: variant, mode: "insensitive" as const } },
    {
      feedbackType: {
        is: { name: { contains: variant, mode: "insensitive" as const } },
      },
    },
  ]);
  or.push({ feedback: { some: { deletedAt: null, OR: feedbackText } } });

  const activityText = variants.flatMap((variant) => [
    { title: { contains: variant, mode: "insensitive" as const } },
    { description: { contains: variant, mode: "insensitive" as const } },
  ]);
  or.push({ activities: { some: { deletedAt: null, OR: activityText } } });

  for (const variant of variants) {
    or.push({ stage: { name: { contains: variant, mode: "insensitive" } } });
    or.push({
      subStage: { is: { name: { contains: variant, mode: "insensitive" } } },
    });
    or.push({
      businessType: {
        is: { name: { contains: variant, mode: "insensitive" } },
      },
    });
  }

  const knownSources = new Set<string>(Object.values(CrmLeadSource));
  for (const [source, labels] of Object.entries(SOURCE_LABELS)) {
    if (knownSources.has(source) && labelHit(folded, labels)) {
      or.push({ source: source as CrmLeadSource });
    }
  }
  for (const status of Object.values(CrmLeadStatus)) {
    if (labelHit(folded, STATUS_LABELS[status] ?? [])) or.push({ status });
  }
  for (const [tag, labels] of Object.entries(TAG_LABELS)) {
    if (labelHit(folded, labels)) or.push({ tags: { has: tag } });
  }

  return or;
}
