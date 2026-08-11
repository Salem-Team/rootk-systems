import {
  fetchOrganicAdsOverview,
  fetchOrganicAdsPerformance,
  fetchSalesAdvertisingProfile,
} from "@/api/organic-ads.api";
import { isApiMode } from "@/lib/env";
import { enrichWithAudit } from "@/lib/entity";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import {
  buildKpis,
  buildNeedsAttention,
  buildPlatformBreakdown,
  buildSalesPerformance,
  buildTeamActivity,
  buildWeeklyActivity,
  computeHealthScore,
  isInRange,
} from "@/lib/organic-ads-analytics";
import { canOrganicAds } from "@/lib/organic-ads-policies";
import {
  organicAdHistoryRepository,
  organicAdvertisementRepository,
} from "@/repositories/organic-ads.repository";
import { employeeRepository } from "@/repositories";
import { fromError, ok } from "@/services/api-result";
import { simulateDelay } from "@/services/fake-api";
import {
  authPermissionSet,
  getSessionRole,
  getSessionUserId,
  getWorkEmployeeId,
} from "@/stores/session-store";
import type { ApiResponse } from "@/types";
import type {
  DateRangePreset,
  OrganicAdsOverview,
  SalesAdvertisingProfile,
  SalesPerformanceRow,
  TeamActivitySort,
} from "@/types/organic-ads";
import {
  assertCap,
  canSeeOrganicAdsTeam,
  defaultSettings,
  linkedTargetsForAds,
  scopedAds,
} from "./helpers";

export async function getOrganicAdsOverview(
  range: DateRangePreset = "this_week",
  activitySort: TeamActivitySort = "ads"
): Promise<ApiResponse<OrganicAdsOverview>> {
  try {
    if (isApiMode()) return fetchOrganicAdsOverview(range, activitySort);
    await simulateDelay();
    assertCap("view_own");
    const [ads, settings, history, employees] = await Promise.all([
      scopedAds(),
      defaultSettings(),
      organicAdHistoryRepository.latest(30),
      employeeRepository.findAll(),
    ]);
    const nameMap = new Map(employees.map((e) => [e.id, e.name]));
    const empLite = employees.map((e) => ({ id: e.id, name: e.name }));
    const linkedTargets = await linkedTargetsForAds(
      ads,
      canSeeOrganicAdsTeam() ? null : getWorkEmployeeId()
    );

    return ok({
      kpis: buildKpis(ads, range),
      teamActivity: canSeeOrganicAdsTeam()
        ? buildTeamActivity(ads, empLite, settings, activitySort)
        : buildTeamActivity(
            ads,
            empLite.filter((e) => e.id === getWorkEmployeeId()),
            settings,
            activitySort
          ),
      needsAttention: canSeeOrganicAdsTeam()
        ? buildNeedsAttention(ads, settings, new Date(), nameMap)
        : buildNeedsAttention(ads, settings, new Date(), nameMap).filter(
            (i) => i.employeeId === getWorkEmployeeId()
          ),
      weeklyActivity: buildWeeklyActivity(ads),
      platforms: buildPlatformBreakdown(ads),
      recentActivity: history.filter((h) => {
        if (canOrganicAds(getSessionRole(), "view_audit", authPermissionSet())) return true;
        const mine = getWorkEmployeeId();
        return h.actorId === mine || h.actorId === getSessionUserId();
      }),
      settings,
      range,
      linkedTargets,
    });
  } catch (error) {
    return fromError(error, {
      kpis: {
        totalAds: 0,
        activeAds: 0,
        adsInPeriod: 0,
        salesParticipating: 0,
        needsAttention: 0,
      },
      teamActivity: [],
      needsAttention: [],
      weeklyActivity: [],
      platforms: [],
      recentActivity: [],
      settings: enrichWithAudit(
        {
          id: "organic-ads-settings",
          weeklyTarget: 3,
          allowDuplicateOverride: false,
        },
        "system"
      ),
      range,
      linkedTargets: [],
    });
  }
}

export async function getSalesPerformance(): Promise<
  ApiResponse<SalesPerformanceRow[]>
> {
  try {
    if (isApiMode()) return fetchOrganicAdsPerformance();
    await simulateDelay();
    assertCap("view_performance");
    const [ads, settings, employees] = await Promise.all([
      scopedAds(),
      defaultSettings(),
      employeeRepository.findAll(),
    ]);
    return ok(
      buildSalesPerformance(
        ads,
        employees.map((e) => ({
          id: e.id,
          name: e.name,
          department: e.department,
        })),
        settings
      )
    );
  } catch (error) {
    return fromError(error, []);
  }
}

export async function getSalesAdvertisingProfile(
  employeeId: string
): Promise<ApiResponse<SalesAdvertisingProfile | null>> {
  try {
    if (isApiMode()) return fetchSalesAdvertisingProfile(employeeId);
    await simulateDelay();
    if (
      !canSeeOrganicAdsTeam() &&
      employeeId !== getWorkEmployeeId()
    ) {
      throw new ForbiddenError("You can only view your own advertising profile");
    }
    assertCap("view_own");

    const [allAds, settings, employees] = await Promise.all([
      organicAdvertisementRepository.findAll(),
      defaultSettings(),
      employeeRepository.findAll(),
    ]);
    const employee = employees.find((e) => e.id === employeeId);
    if (!employee) throw new NotFoundError("Employee not found");

    const ads = allAds.filter(
      (a) => !a.deletedAt && a.ownerEmployeeId === employeeId
    );
    const platformMap = new Map<string, number>();
    for (const a of ads) {
      platformMap.set(a.platform, (platformMap.get(a.platform) ?? 0) + 1);
    }

    const linkedTargets = await linkedTargetsForAds(ads, employeeId);

    return ok({
      employeeId,
      name: employee.name,
      department: employee.department,
      totalAds: ads.length,
      activeAds: ads.filter((a) => a.status === "active").length,
      platformsUsed: platformMap.size,
      adsThisWeek: ads.filter((a) => isInRange(a.addedAt, "this_week")).length,
      healthScore: computeHealthScore(ads, settings.weeklyTarget),
      weeklyTarget: settings.weeklyTarget,
      platformCounts: [...platformMap.entries()]
        .map(([platform, count]) => ({
          platform: platform as SalesAdvertisingProfile["platformCounts"][number]["platform"],
          count,
        }))
        .sort((a, b) => b.count - a.count),
      recentAds: [...ads]
        .sort((a, b) => b.addedAt.localeCompare(a.addedAt))
        .slice(0, 12),
      leads: null,
      qualified: null,
      deals: null,
      linkedTargets,
    });
  } catch (error) {
    return fromError(error, null);
  }
}
