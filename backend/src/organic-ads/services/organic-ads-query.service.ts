import { Injectable, NotFoundException } from "@nestjs/common";
import { AdPlatform, AdStatus, AdValidationStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import {
  assertEmployeeInScope,
  employeeIdsForModule,
} from "../../common/employee-scope";
import { inspectAdUrl } from "../../lib/organic-ads-url";
import {
  assertCap,
  buildScopedWhere,
  findDuplicate,
  mapAd,
  resolveDateRange,
  type Actor,
  type DateRangePreset,
} from "../organic-ads.helpers";

/** Advertisement reads: URL inspection, list/filter, and single lookups. */
@Injectable()
export class OrganicAdsQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async inspectUrl(companyId: string, actor: Actor, url: string) {
    assertCap(actor, "create");
    const inspected = inspectAdUrl(url ?? "");
    const ads = await this.prisma.organicAdvertisement.findMany({
      where: await buildScopedWhere(this.prisma, companyId, actor),
    });
    const duplicate = findDuplicate(
      ads,
      inspected.canonicalUrl,
      inspected.externalId,
      inspected.platform as AdPlatform
    );
    return {
      ...inspected,
      duplicate: duplicate ? mapAd(duplicate) : null,
      potentialDuplicates: [],
    };
  }

  async list(companyId: string, actor: Actor, filters: Record<string, unknown> = {}) {
    assertCap(actor, "view_own");
    const where = await buildScopedWhere(this.prisma, companyId, actor);

    if (typeof filters.search === "string" && filters.search.trim()) {
      const q = filters.search.trim();
      where.OR = [
        { url: { contains: q, mode: "insensitive" } },
        { project: { contains: q, mode: "insensitive" } },
        { campaign: { contains: q, mode: "insensitive" } },
        { notes: { contains: q, mode: "insensitive" } },
      ];
    }
    if (typeof filters.ownerEmployeeId === "string" && filters.ownerEmployeeId) {
      const allowed = await employeeIdsForModule(
        this.prisma,
        companyId,
        actor,
        "organicAds.viewAll",
        "organicAds.viewTeam"
      );
      assertEmployeeInScope(filters.ownerEmployeeId, allowed);
      where.ownerEmployeeId = filters.ownerEmployeeId;
    }
    if (typeof filters.platform === "string" && filters.platform) {
      where.platform = filters.platform as AdPlatform;
    }
    if (typeof filters.project === "string" && filters.project) {
      where.project = filters.project;
    }
    if (typeof filters.status === "string" && filters.status) {
      where.status = filters.status as AdStatus;
    }
    if (
      typeof filters.validationStatus === "string" &&
      filters.validationStatus
    ) {
      where.validationStatus = filters.validationStatus as AdValidationStatus;
    }
    if (filters.duplicateOnly) {
      where.OR = [
        { status: AdStatus.duplicate },
        { duplicateOfId: { not: null } },
      ];
    }
    if (
      typeof filters.range === "string" &&
      filters.range &&
      filters.range !== "all"
    ) {
      const { from, to } = resolveDateRange(filters.range as DateRangePreset);
      if (from) where.addedAt = { gte: from, lte: to };
    }

    const page = Math.max(1, Number(filters.page) || 1);
    const pageSize = Math.min(100, Math.max(5, Number(filters.pageSize) || 20));
    const sortBy = String(filters.sortBy ?? "addedAt");
    const sortDir = filters.sortDir === "asc" ? "asc" : "desc";
    const orderBy: Prisma.OrganicAdvertisementOrderByWithRelationInput =
      sortBy === "platform"
        ? { platform: sortDir }
        : sortBy === "status"
          ? { status: sortDir }
          : sortBy === "owner"
            ? { ownerEmployeeId: sortDir }
            : { addedAt: sortDir };

    const [total, rows] = await Promise.all([
      this.prisma.organicAdvertisement.count({ where }),
      this.prisma.organicAdvertisement.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: rows.map(mapAd),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async byId(companyId: string, actor: Actor, id: string) {
    assertCap(actor, "view_own");
    const row = await this.prisma.organicAdvertisement.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!row) throw new NotFoundException("Advertisement not found");
    const allowed = await employeeIdsForModule(
      this.prisma,
      companyId,
      actor,
      "organicAds.viewAll",
      "organicAds.viewTeam"
    );
    assertEmployeeInScope(row.ownerEmployeeId, allowed);
    return mapAd(row);
  }
}
