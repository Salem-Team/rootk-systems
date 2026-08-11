import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AdStatus, type OrganicAdvertisement } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { iso } from "../../common/mappers";
import { isOrganicAdsType } from "../../lib/organic-ads-task-match";
import {
  assertCap,
  buildScopedWhere,
  canSeeOrganicAdsTeam,
  computeHealthScore,
  isInRange,
  mapAd,
  type Actor,
} from "../organic-ads.helpers";
import { OrganicAdsSettingsService } from "./organic-ads-settings.service";

/** Per-employee organic ads performance rollups and profiles. */
@Injectable()
export class OrganicAdsPerformanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: OrganicAdsSettingsService
  ) {}

  async getSalesPerformance(companyId: string, actor: Actor) {
    assertCap(actor, "view_performance");
    const [settings, ads, employees] = await Promise.all([
      this.settings.ensureSettings(companyId),
      this.prisma.organicAdvertisement.findMany({
        where: buildScopedWhere(companyId, actor),
      }),
      this.prisma.employee.findMany({
        where: { companyId, deletedAt: null },
      }),
    ]);

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
          list.map((a) => iso(a.addedAt)).sort((a, b) => b.localeCompare(a))[0] ??
          null;
        return {
          employeeId: e.id,
          name: e.name,
          department: e.department,
          ads: list.length,
          active: list.filter((a) => a.status === AdStatus.active).length,
          platforms: platforms.size,
          weeklyCount: list.filter((a) =>
            isInRange(iso(a.addedAt), "this_week")
          ).length,
          weeklyTarget: settings.weeklyTarget,
          healthScore: computeHealthScore(list, settings.weeklyTarget),
          lastActivityAt: last,
          leads: null,
          qualified: null,
          deals: null,
          conversionRate: null,
        };
      })
      .sort((a, b) => b.ads - a.ads);
  }

  async getSalesProfile(companyId: string, actor: Actor, employeeId: string) {
    assertCap(actor, "view_own");
    if (
      !canSeeOrganicAdsTeam(actor) &&
      employeeId !== actor.employeeId
    ) {
      throw new ForbiddenException(
        "You can only view your own advertising profile"
      );
    }

    const [settings, employee, ads, targets] = await Promise.all([
      this.settings.ensureSettings(companyId),
      this.prisma.employee.findFirst({
        where: { id: employeeId, companyId, deletedAt: null },
      }),
      this.prisma.organicAdvertisement.findMany({
        where: { companyId, ownerEmployeeId: employeeId, deletedAt: null },
        orderBy: { addedAt: "desc" },
      }),
      this.prisma.performanceTarget.findMany({
        where: {
          companyId,
          deletedAt: null,
          assigneeIds: { has: employeeId },
        },
        select: {
          id: true,
          title: true,
          quantity: true,
          completedQuantity: true,
          status: true,
          health: true,
          type: { select: { name: true, unit: true } },
        },
        take: 20,
      }),
    ]);

    if (!employee) throw new NotFoundException("Employee not found");

    const platformMap = new Map<string, number>();
    for (const a of ads) {
      platformMap.set(a.platform, (platformMap.get(a.platform) ?? 0) + 1);
    }

    return {
      employeeId,
      name: employee.name,
      department: employee.department,
      totalAds: ads.length,
      activeAds: ads.filter((a) => a.status === AdStatus.active).length,
      platformsUsed: platformMap.size,
      adsThisWeek: ads.filter((a) => isInRange(iso(a.addedAt), "this_week"))
        .length,
      healthScore: computeHealthScore(ads, settings.weeklyTarget),
      weeklyTarget: settings.weeklyTarget,
      platformCounts: [...platformMap.entries()]
        .map(([platform, count]) => ({ platform, count }))
        .sort((a, b) => b.count - a.count),
      recentAds: ads.slice(0, 12).map(mapAd),
      leads: null,
      qualified: null,
      deals: null,
      linkedTargets: targets
        .filter(
          (t) =>
            isOrganicAdsType(t.type) ||
            ads.some((a) => a.targetId === t.id)
        )
        .map((t) => ({
          id: t.id,
          title: t.title,
          typeName: t.type.name,
          unit: t.type.unit,
          quantity: t.quantity,
          completedQuantity: t.completedQuantity,
          remaining: Math.max(0, t.quantity - t.completedQuantity),
          status: t.status,
          health: t.health,
        })),
    };
  }
}
