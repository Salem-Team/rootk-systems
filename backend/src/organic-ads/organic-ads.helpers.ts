import { ForbiddenException } from "@nestjs/common";
import {
  AdPlatform,
  AdStatus,
  AdValidationStatus,
  Prisma,
  type OrganicAdvertisement,
  type OrganicAdsSettings,
} from "@prisma/client";
import {
  differenceInCalendarDays,
  endOfWeek,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";
import { auditFields, iso, isoOrNull } from "../common/mappers";
import { canOrganicAds } from "../lib/organic-ads-policies";

export type Actor = {
  userId: string;
  role: "admin" | "employee";
  employeeId: string;
};

export type DateRangePreset = "this_week" | "last_7_days" | "this_month" | "all";
export type TeamActivitySort = "ads" | "last_activity";

export function assertCap(
  actor: Actor,
  capability: Parameters<typeof canOrganicAds>[1]
) {
  if (!canOrganicAds(actor.role, capability)) {
    throw new ForbiddenException("You do not have permission for this action");
  }
}

export function resolveDateRange(range: DateRangePreset, now = new Date()) {
  const to = now;
  if (range === "all") return { from: null as Date | null, to };
  if (range === "last_7_days") {
    return { from: startOfDay(subDays(now, 6)), to };
  }
  if (range === "this_month") return { from: startOfMonth(now), to };
  return {
    from: startOfWeek(now, { weekStartsOn: 0 }),
    to: endOfWeek(now, { weekStartsOn: 0 }),
  };
}

export function isInRange(
  isoDate: string,
  range: DateRangePreset,
  now = new Date()
) {
  const { from, to } = resolveDateRange(range, now);
  if (!from) return true;
  const d = parseISO(isoDate);
  return isWithinInterval(d, { start: from, end: to });
}

export function mapAd(row: OrganicAdvertisement) {
  return {
    id: row.id,
    ownerEmployeeId: row.ownerEmployeeId,
    platform: row.platform,
    adType: row.adType,
    url: row.url,
    canonicalUrl: row.canonicalUrl,
    externalId: row.externalId,
    project: row.project,
    campaign: row.campaign,
    notes: row.notes,
    status: row.status,
    validationStatus: row.validationStatus,
    validationMessage: row.validationMessage,
    duplicateOfId: row.duplicateOfId,
    similarityScore: row.similarityScore,
    addedAt: iso(row.addedAt),
    lastVerifiedAt: isoOrNull(row.lastVerifiedAt),
    leadsCount: row.leadsCount,
    qualifiedLeadsCount: row.qualifiedLeadsCount,
    dealsCount: row.dealsCount,
    workTaskId: row.workTaskId,
    targetId: row.targetId,
    ...auditFields(row),
  };
}

export function mapSettings(row: OrganicAdsSettings) {
  return {
    id: row.id,
    weeklyTarget: row.weeklyTarget,
    allowDuplicateOverride: row.allowDuplicateOverride,
    ...auditFields(row),
  };
}

export function computeHealthScore(
  ads: OrganicAdvertisement[],
  weeklyTarget: number,
  now = new Date()
) {
  if (ads.length === 0) return 0;
  const active = ads.filter((a) => a.status === AdStatus.active).length;
  const duplicates = ads.filter(
    (a) => a.status === AdStatus.duplicate || a.duplicateOfId
  ).length;
  const invalid = ads.filter(
    (a) =>
      a.validationStatus === AdValidationStatus.invalid ||
      a.validationStatus === AdValidationStatus.broken ||
      a.validationStatus === AdValidationStatus.unsupported
  ).length;
  const weekly = ads.filter((a) =>
    isInRange(iso(a.addedAt), "this_week", now)
  ).length;
  const last = ads
    .map((a) => a.addedAt.getTime())
    .sort((a, b) => b - a)[0];
  const daysSince = last
    ? differenceInCalendarDays(now, new Date(last))
    : 30;

  let score = 40;
  score += Math.min(25, (active / Math.max(ads.length, 1)) * 25);
  score += Math.min(20, (weekly / Math.max(weeklyTarget, 1)) * 20);
  if (daysSince <= 2) score += 15;
  else if (daysSince <= 5) score += 8;
  else if (daysSince > 7) score -= 15;
  score -= Math.min(20, duplicates * 6);
  score -= Math.min(20, invalid * 8);
  return Math.max(0, Math.min(100, Math.round(score)));
}

/** Tenant + team-visibility scoped where-clause for advertisement queries. */
export function buildScopedWhere(
  companyId: string,
  actor: Actor
): Prisma.OrganicAdvertisementWhereInput {
  const where: Prisma.OrganicAdvertisementWhereInput = {
    companyId,
    deletedAt: null,
  };
  if (!canOrganicAds(actor.role, "view_team")) {
    where.ownerEmployeeId = actor.employeeId;
  }
  return where;
}

export function findDuplicate(
  ads: OrganicAdvertisement[],
  canonicalUrl: string,
  externalId: string | null,
  platform: AdPlatform,
  excludeId?: string
) {
  const exact = ads.find(
    (a) => a.id !== excludeId && a.canonicalUrl === canonicalUrl
  );
  if (exact) return exact;
  if (externalId) {
    return (
      ads.find(
        (a) =>
          a.id !== excludeId &&
          a.platform === platform &&
          a.externalId === externalId
      ) ?? null
    );
  }
  return null;
}
