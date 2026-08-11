import { Injectable } from "@nestjs/common";
import { AdPlatform, AdStatus, AdValidationStatus, TargetStatus, type OrganicAdvertisement } from "@prisma/client";
import { differenceInCalendarDays, eachDayOfInterval, format, parseISO, startOfDay, subDays } from "date-fns";
import { PrismaService } from "../../prisma/prisma.service";
import { iso } from "../../common/mappers";
import { isOrganicAdsType } from "../../lib/organic-ads-task-match";
import {
  assertCap,
  buildScopedWhere,
  canSeeOrganicAdsTeam,
  computeHealthScore,
  isInRange,
  mapSettings,
  type Actor,
  type DateRangePreset,
  type TeamActivitySort,
} from "../organic-ads.helpers";
import { OrganicAdsSettingsService } from "./organic-ads-settings.service";
import { OrganicAdsHistoryService } from "./organic-ads-history.service";

/** Team-wide organic ads overview: KPIs, activity feed, attention alerts. */
@Injectable()
export class OrganicAdsOverviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: OrganicAdsSettingsService,
    private readonly history: OrganicAdsHistoryService
  ) {}

  async getOverview(
    companyId: string,
    actor: Actor,
    range: DateRangePreset = "this_week",
    activitySort: TeamActivitySort = "ads"
  ) {
    assertCap(actor, "view_own");
    const [settings, ads, employees, historyEvents, linkedTargets] =
      await Promise.all([
        this.settings.ensureSettings(companyId),
        this.prisma.organicAdvertisement.findMany({
          where: buildScopedWhere(companyId, actor),
        }),
        this.prisma.employee.findMany({
          where: { companyId, deletedAt: null },
        }),
        this.history.getHistory(companyId, actor, 30),
        this.prisma.performanceTarget.findMany({
          where: {
            companyId,
            deletedAt: null,
            status: { notIn: [TargetStatus.cancelled, TargetStatus.archived] },
            ...(canSeeOrganicAdsTeam(actor) || !actor.employeeId
              ? {}
              : { assigneeIds: { has: actor.employeeId } }),
          },
          select: {
            id: true,
            title: true,
            quantity: true,
            completedQuantity: true,
            status: true,
            health: true,
            assigneeIds: true,
            typeId: true,
            type: { select: { name: true, unit: true, metadata: true } },
          },
          take: 80,
        }),
      ]);

    const nameMap = new Map(employees.map((e) => [e.id, e.name]));
    const now = new Date();
    const owners = new Set(ads.map((a) => a.ownerEmployeeId));

    const byOwner = new Map<string, OrganicAdvertisement[]>();
    for (const ad of ads) {
      const list = byOwner.get(ad.ownerEmployeeId) ?? [];
      list.push(ad);
      byOwner.set(ad.ownerEmployeeId, list);
    }

    const teamActivity = [...byOwner.entries()]
      .map(([employeeId, list]) => {
        const last =
          list
            .map((a) => iso(a.addedAt))
            .sort((a, b) => b.localeCompare(a))[0] ?? null;
        return {
          employeeId,
          name: nameMap.get(employeeId) ?? "Sales",
          adsCount: list.length,
          activeCount: list.filter((a) => a.status === AdStatus.active).length,
          lastActivityAt: last,
          weeklyCount: list.filter((a) =>
            isInRange(iso(a.addedAt), "this_week", now)
          ).length,
          weeklyTarget: settings.weeklyTarget,
          healthScore: computeHealthScore(list, settings.weeklyTarget, now),
        };
      })
      .sort((a, b) =>
        activitySort === "last_activity"
          ? (b.lastActivityAt ?? "").localeCompare(a.lastActivityAt ?? "")
          : b.adsCount - a.adsCount
      );

    const needsAttention: Array<{
      id: string;
      severity: "critical" | "warning" | "info";
      kind: string;
      employeeId: string | null;
      employeeName: string;
      advertisementId: string | null;
      title: string;
      description: string;
      href: string;
    }> = [];

    for (const row of teamActivity) {
      const list = byOwner.get(row.employeeId) ?? [];
      const last = row.lastActivityAt;
      const days = last
        ? differenceInCalendarDays(now, parseISO(last))
        : 99;
      const dupes = list.filter(
        (a) => a.status === AdStatus.duplicate || a.duplicateOfId
      );
      const invalid = list.filter(
        (a) =>
          a.validationStatus === AdValidationStatus.invalid ||
          a.validationStatus === AdValidationStatus.broken ||
          a.validationStatus === AdValidationStatus.unsupported
      );

      if (days >= 6) {
        needsAttention.push({
          id: `attn-inactive-${row.employeeId}`,
          severity: days >= 9 ? "critical" : "warning",
          kind: days >= 9 ? "stale" : "inactive",
          employeeId: row.employeeId,
          employeeName: row.name,
          advertisementId: null,
          title: row.name,
          description:
            days >= 9
              ? `Last advertisement ${days} days ago`
              : `No new advertisement for ${days} days`,
          href: `/organic-ads?tab=performance&employeeId=${row.employeeId}`,
        });
      }
      if (dupes.length > 0) {
        needsAttention.push({
          id: `attn-dupe-${row.employeeId}`,
          severity: "warning",
          kind: "duplicate",
          employeeId: row.employeeId,
          employeeName: row.name,
          advertisementId: dupes[0]?.id ?? null,
          title: row.name,
          description: `${dupes.length} duplicate advertisement${dupes.length === 1 ? "" : "s"} detected`,
          href: `/organic-ads?tab=validation&filter=duplicate&employeeId=${row.employeeId}`,
        });
      }
      if (invalid.length > 0) {
        needsAttention.push({
          id: `attn-invalid-${row.employeeId}`,
          severity: "warning",
          kind: "invalid_links",
          employeeId: row.employeeId,
          employeeName: row.name,
          advertisementId: invalid[0]?.id ?? null,
          title: row.name,
          description: `${invalid.length} invalid advertisement link${invalid.length === 1 ? "" : "s"}`,
          href: `/organic-ads?tab=validation&filter=invalid&employeeId=${row.employeeId}`,
        });
      }
      if (row.weeklyCount < row.weeklyTarget) {
        needsAttention.push({
          id: `attn-target-${row.employeeId}`,
          severity: row.weeklyCount === 0 ? "critical" : "info",
          kind: "below_target",
          employeeId: row.employeeId,
          employeeName: row.name,
          advertisementId: null,
          title: row.name,
          description: `${row.weeklyCount} / ${row.weeklyTarget} weekly ads`,
          href: `/organic-ads?tab=performance&employeeId=${row.employeeId}`,
        });
      }
    }

    const start = startOfDay(subDays(now, 6));
    const weeklyActivity = eachDayOfInterval({
      start,
      end: startOfDay(now),
    }).map((day) => {
      const key = format(day, "yyyy-MM-dd");
      return {
        date: key,
        label: format(day, "EEE"),
        count: ads.filter((a) => iso(a.addedAt).slice(0, 10) === key).length,
      };
    });

    const platformMap = new Map<
      AdPlatform,
      { count: number; sales: Set<string>; projects: Set<string> }
    >();
    for (const ad of ads) {
      const row = platformMap.get(ad.platform) ?? {
        count: 0,
        sales: new Set<string>(),
        projects: new Set<string>(),
      };
      row.count += 1;
      row.sales.add(ad.ownerEmployeeId);
      if (ad.project.trim()) row.projects.add(ad.project.trim());
      platformMap.set(ad.platform, row);
    }

    return {
      kpis: {
        totalAds: ads.length,
        activeAds: ads.filter((a) => a.status === AdStatus.active).length,
        adsInPeriod: ads.filter((a) => isInRange(iso(a.addedAt), range, now))
          .length,
        salesParticipating: owners.size,
        needsAttention: needsAttention.length,
      },
      teamActivity,
      needsAttention,
      weeklyActivity,
      platforms: [...platformMap.entries()]
        .map(([platform, row]) => ({
          platform,
          count: row.count,
          activeSales: row.sales.size,
          projects: row.projects.size,
        }))
        .sort((a, b) => b.count - a.count),
      recentActivity: historyEvents,
      settings: mapSettings(settings),
      range,
      linkedTargets: linkedTargets
        .filter(
          (t) =>
            isOrganicAdsType(t.type) ||
            ads.some((a) => a.targetId === t.id)
        )
        .slice(0, 20)
        .map((t) => ({
          id: t.id,
          title: t.title,
          quantity: t.quantity,
          completedQuantity: t.completedQuantity,
          remaining: Math.max(0, t.quantity - t.completedQuantity),
          status: t.status,
          health: t.health,
          assigneeIds: t.assigneeIds,
          typeName: t.type.name,
          unit: t.type.unit,
        })),
    };
  }
}
