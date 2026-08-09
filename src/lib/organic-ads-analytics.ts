import { eachDayOfInterval, format, startOfDay, subDays } from "date-fns";
import type {
  AdPlatform,
  DateRangePreset,
  OrganicAdvertisement,
  OrganicAdsKpis,
  OrganicAdsSettings,
  PlatformBreakdownRow,
  SalesPerformanceRow,
  TeamActivityRow,
  TeamActivitySort,
  WeeklyActivityPoint,
} from "@/types/organic-ads";
import { isInRange } from "./organic-ads-date-range";
import { computeHealthScore } from "./organic-ads-health-score";
import { buildNeedsAttention } from "./organic-ads-attention";

export { resolveDateRange, isInRange } from "./organic-ads-date-range";
export { computeHealthScore } from "./organic-ads-health-score";
export { buildNeedsAttention } from "./organic-ads-attention";

export function buildKpis(
  ads: OrganicAdvertisement[],
  range: DateRangePreset,
  now = new Date()
): OrganicAdsKpis {
  const owners = new Set(ads.map((a) => a.ownerEmployeeId));
  const needs = buildNeedsAttention(ads, { weeklyTarget: 3 } as OrganicAdsSettings, now);
  return {
    totalAds: ads.length,
    activeAds: ads.filter((a) => a.status === "active").length,
    adsInPeriod: ads.filter((a) => isInRange(a.addedAt, range, now)).length,
    salesParticipating: owners.size,
    needsAttention: needs.length,
  };
}

export function buildTeamActivity(
  ads: OrganicAdvertisement[],
  employees: { id: string; name: string }[],
  settings: OrganicAdsSettings,
  sort: TeamActivitySort = "ads",
  now = new Date()
): TeamActivityRow[] {
  const byOwner = new Map<string, OrganicAdvertisement[]>();
  for (const ad of ads) {
    const list = byOwner.get(ad.ownerEmployeeId) ?? [];
    list.push(ad);
    byOwner.set(ad.ownerEmployeeId, list);
  }

  const rows: TeamActivityRow[] = employees
    .filter((e) => byOwner.has(e.id))
    .map((e) => {
      const list = byOwner.get(e.id) ?? [];
      const last = list
        .map((a) => a.addedAt)
        .sort((a, b) => b.localeCompare(a))[0] ?? null;
      return {
        employeeId: e.id,
        name: e.name,
        adsCount: list.length,
        activeCount: list.filter((a) => a.status === "active").length,
        lastActivityAt: last,
        weeklyCount: list.filter((a) =>
          isInRange(a.addedAt, "this_week", now)
        ).length,
        weeklyTarget: settings.weeklyTarget,
        healthScore: computeHealthScore(list, settings.weeklyTarget, now),
      };
    });

  rows.sort((a, b) => {
    if (sort === "last_activity") {
      return (b.lastActivityAt ?? "").localeCompare(a.lastActivityAt ?? "");
    }
    return b.adsCount - a.adsCount;
  });

  return rows;
}

export function buildWeeklyActivity(
  ads: OrganicAdvertisement[],
  now = new Date()
): WeeklyActivityPoint[] {
  const start = startOfDay(subDays(now, 6));
  const days = eachDayOfInterval({ start, end: startOfDay(now) });
  return days.map((day) => {
    const key = format(day, "yyyy-MM-dd");
    const count = ads.filter((a) => a.addedAt.slice(0, 10) === key).length;
    return {
      date: key,
      label: format(day, "EEE"),
      count,
    };
  });
}

export function buildPlatformBreakdown(
  ads: OrganicAdvertisement[]
): PlatformBreakdownRow[] {
  const map = new Map<
    AdPlatform,
    { count: number; sales: Set<string>; projects: Set<string> }
  >();
  for (const ad of ads) {
    const row = map.get(ad.platform) ?? {
      count: 0,
      sales: new Set<string>(),
      projects: new Set<string>(),
    };
    row.count += 1;
    row.sales.add(ad.ownerEmployeeId);
    if (ad.project.trim()) row.projects.add(ad.project.trim());
    map.set(ad.platform, row);
  }
  return [...map.entries()]
    .map(([platform, row]) => ({
      platform,
      count: row.count,
      activeSales: row.sales.size,
      projects: row.projects.size,
    }))
    .sort((a, b) => b.count - a.count);
}

export function buildSalesPerformance(
  ads: OrganicAdvertisement[],
  employees: { id: string; name: string; department: string }[],
  settings: OrganicAdsSettings,
  now = new Date()
): SalesPerformanceRow[] {
  const byOwner = new Map<string, OrganicAdvertisement[]>();
  for (const ad of ads) {
    const list = byOwner.get(ad.ownerEmployeeId) ?? [];
    list.push(ad);
    byOwner.set(ad.ownerEmployeeId, list);
  }

  return employees
    .filter((e) => byOwner.has(e.id))
    .map((e) => {
      const list = byOwner.get(e.id) ?? [];
      const platforms = new Set(list.map((a) => a.platform));
      const last =
        list.map((a) => a.addedAt).sort((a, b) => b.localeCompare(a))[0] ??
        null;
      // Attribution only when every ad carries real counts (never invent).
      const hasLeads = list.every((a) => a.leadsCount != null);
      const leads = hasLeads
        ? list.reduce((s, a) => s + (a.leadsCount ?? 0), 0)
        : null;
      const hasQualified = list.every((a) => a.qualifiedLeadsCount != null);
      const qualified = hasQualified
        ? list.reduce((s, a) => s + (a.qualifiedLeadsCount ?? 0), 0)
        : null;
      const hasDeals = list.every((a) => a.dealsCount != null);
      const deals = hasDeals
        ? list.reduce((s, a) => s + (a.dealsCount ?? 0), 0)
        : null;
      const conversionRate =
        leads != null && deals != null && leads > 0
          ? Math.round((deals / leads) * 1000) / 10
          : null;

      return {
        employeeId: e.id,
        name: e.name,
        department: e.department,
        ads: list.length,
        active: list.filter((a) => a.status === "active").length,
        platforms: platforms.size,
        weeklyCount: list.filter((a) =>
          isInRange(a.addedAt, "this_week", now)
        ).length,
        weeklyTarget: settings.weeklyTarget,
        healthScore: computeHealthScore(list, settings.weeklyTarget, now),
        lastActivityAt: last,
        leads,
        qualified,
        deals,
        conversionRate,
      };
    })
    .sort((a, b) => b.ads - a.ads);
}
