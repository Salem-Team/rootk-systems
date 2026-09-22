import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { assertCap, type Actor } from "./crm-access";
import { mapLead } from "./crm-mappers";
import { searchCanonicalFromQuery, summarizeLead } from "./crm-phone";
import { CrmSharedService } from "./crm-shared.service";

@Injectable()
export class CrmPhoneLookupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shared: CrmSharedService
  ) {}

  async matchByPhone(
    companyId: string,
    actor: Actor,
    phone: string | undefined
  ) {
    assertCap(actor, "view");
    const canonical = searchCanonicalFromQuery(String(phone ?? ""));
    if (!canonical) {
      throw new BadRequestException({
        message: "Not a valid phone number",
        code: "INVALID_PHONE",
      });
    }

    const ownerIds = await this.shared.resolveOwnerIds(companyId, actor);
    const owner = this.shared.scopeOwnerFilter(actor, ownerIds);
    const row =
      (await this.prisma.crmLead.findFirst({
        where: {
          companyId,
          deletedAt: null,
          recordType: "lead",
          ...owner,
          ...phoneIdentityWhere(canonical),
        },
      })) ??
      (await this.prisma.crmLead.findFirst({
        where: {
          companyId,
          deletedAt: null,
          recordType: "cold_call",
          ...owner,
          ...phoneIdentityWhere(canonical),
        },
      }));

    if (row) return { lead: mapLead(row), ownedByOther: false };

    if (ownerIds === null) return { lead: null, ownedByOther: false };

    const hidden = await this.prisma.crmLead.findFirst({
      where: {
        companyId,
        deletedAt: null,
        ...phoneIdentityWhere(canonical),
      },
      select: { id: true },
    });
    return { lead: null, ownedByOther: Boolean(hidden) };
  }

  async listDuplicateGroups(companyId: string, actor: Actor) {
    assertCap(actor, "view");
    const owner = await this.shared.ownerScope(companyId, actor);
    const grouped = await this.prisma.crmLead.groupBy({
      by: ["phoneNormalized"],
      where: {
        companyId,
        deletedAt: null,
        recordType: "lead",
        phoneNormalized: { not: null },
        ...owner,
      },
      _count: { _all: true },
    });
    const duplicateKeys = grouped
      .filter((row) => row._count._all > 1 && row.phoneNormalized)
      .map((row) => row.phoneNormalized as string);
    if (duplicateKeys.length === 0) return [];

    const rows = await this.prisma.crmLead.findMany({
      where: {
        companyId,
        deletedAt: null,
        recordType: "lead",
        phoneNormalized: { in: duplicateKeys },
        ...owner,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        phoneNormalized: true,
        ownerEmployeeId: true,
        stageId: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const groups = new Map<string, typeof rows>();
    for (const row of rows) {
      const key = row.phoneNormalized;
      if (!key) continue;
      const list = groups.get(key) ?? [];
      list.push(row);
      groups.set(key, list);
    }

    return [...groups.entries()]
      .filter(([, leads]) => leads.length > 1)
      .map(([phoneNormalized, leads]) => ({
        phoneNormalized,
        count: leads.length,
        leads: leads.map(summarizeLead),
      }));
  }
}

function phoneIdentityWhere(canonical: string) {
  return {
    OR: [
      { phoneNormalized: canonical },
      {
        metadata: {
          path: ["contactKeys"],
          array_contains: canonical,
        },
      },
    ],
  };
}
