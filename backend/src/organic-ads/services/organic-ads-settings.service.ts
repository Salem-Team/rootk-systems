import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { mapSettings } from "../organic-ads.helpers";

/** Organic Ads company-level settings (weekly target, duplicate override policy). */
@Injectable()
export class OrganicAdsSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureSettings(companyId: string, actorId = "system") {
    const existing = await this.prisma.organicAdsSettings.findUnique({
      where: { companyId },
    });
    if (existing) return existing;
    return this.prisma.organicAdsSettings.create({
      data: {
        companyId,
        weeklyTarget: 3,
        allowDuplicateOverride: true,
        createdBy: actorId,
        updatedBy: actorId,
      },
    });
  }

  async getSettings(companyId: string) {
    return mapSettings(await this.ensureSettings(companyId));
  }

  async updateSettings(
    companyId: string,
    actorId: string,
    body: { weeklyTarget?: number; allowDuplicateOverride?: boolean }
  ) {
    const current = await this.ensureSettings(companyId, actorId);
    const weeklyTarget =
      typeof body.weeklyTarget === "number"
        ? Math.max(0, Math.min(50, Math.round(body.weeklyTarget)))
        : current.weeklyTarget;
    const allowDuplicateOverride =
      typeof body.allowDuplicateOverride === "boolean"
        ? body.allowDuplicateOverride
        : current.allowDuplicateOverride;

    const row = await this.prisma.organicAdsSettings.update({
      where: { companyId },
      data: {
        weeklyTarget,
        allowDuplicateOverride,
        updatedBy: actorId,
        version: { increment: 1 },
      },
    });
    return mapSettings(row);
  }
}
