import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { auditFields } from "../../common/mappers";
import { AppRole } from "../../common/roles";
import { canOrganicAds } from "../../lib/organic-ads-policies";
import { assertCap, type Actor } from "../organic-ads.helpers";

/** Audit trail for advertisement lifecycle events. */
@Injectable()
export class OrganicAdsHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async writeHistory(
    companyId: string,
    input: {
      advertisementId?: string | null;
      action: string;
      actorId: string;
      actorName: string;
      note: string;
      previousValue?: string | null;
      newValue?: string | null;
    }
  ) {
    await this.prisma.organicAdHistoryEvent.create({
      data: {
        companyId,
        advertisementId: input.advertisementId ?? null,
        action: input.action,
        actorId: input.actorId,
        actorName: input.actorName,
        note: input.note,
        previousValue: input.previousValue ?? null,
        newValue: input.newValue ?? null,
        createdBy: input.actorId,
        updatedBy: input.actorId,
      },
    });
  }

  async actorName(companyId: string, actor: Actor) {
    if (actor.role === AppRole.admin) {
      const emp = actor.employeeId
        ? await this.prisma.employee.findFirst({
            where: { id: actor.employeeId, companyId, deletedAt: null },
          })
        : null;
      return emp?.name ?? "Admin";
    }
    const emp = await this.prisma.employee.findFirst({
      where: { id: actor.employeeId, companyId, deletedAt: null },
    });
    return emp?.name ?? "Sales";
  }

  async getHistory(companyId: string, actor: Actor, limit = 40) {
    assertCap(actor, "view_own");
    const rows = await this.prisma.organicAdHistoryEvent.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: Math.min(100, Math.max(1, limit)),
    });

    const filtered = canOrganicAds(actor.role, "view_audit", actor.permissions)
      ? rows
      : rows.filter(
          (h) => h.actorId === actor.userId || h.actorId === actor.employeeId
        );

    return filtered.map((h) => ({
      id: h.id,
      advertisementId: h.advertisementId,
      action: h.action,
      actorId: h.actorId,
      actorName: h.actorName,
      note: h.note,
      previousValue: h.previousValue,
      newValue: h.newValue,
      ...auditFields(h),
    }));
  }
}
