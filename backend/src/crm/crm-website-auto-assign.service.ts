import { Injectable, Logger } from "@nestjs/common";
import { EmployeeStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export type WebsiteAutoLeadConfig = {
  enabled: boolean;
  /** Rotation pool (employee entity ids). */
  employeeIds: string[];
  /** Next index into employeeIds (modulo length). */
  nextIndex: number;
  /** YYYY-MM-DD — only auto-assign on/after this Cairo calendar day. */
  effectiveFrom: string;
};

const META_KEY = "websiteAutoLead";

/** Default recipients requested for production ROOTK (Ziad + Mahmoud). */
const DEFAULT_NAME_ORDER = ["Ziad El Warraqi", "Mahmoud"] as const;

function todayCairoYmd(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function parseConfig(raw: unknown): WebsiteAutoLeadConfig | null {
  const obj = asRecord(raw);
  if (!obj || typeof obj.enabled !== "boolean") return null;
  const employeeIds = Array.isArray(obj.employeeIds)
    ? obj.employeeIds.filter((id): id is string => typeof id === "string" && !!id.trim())
    : [];
  const nextIndex =
    typeof obj.nextIndex === "number" && Number.isFinite(obj.nextIndex)
      ? Math.max(0, Math.floor(obj.nextIndex))
      : 0;
  const effectiveFrom =
    typeof obj.effectiveFrom === "string" && /^\d{4}-\d{2}-\d{2}$/.test(obj.effectiveFrom)
      ? obj.effectiveFrom
      : todayCairoYmd();
  return { enabled: obj.enabled, employeeIds, nextIndex, effectiveFrom };
}

@Injectable()
export class CrmWebsiteAutoAssignService {
  private readonly logger = new Logger(CrmWebsiteAutoAssignService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getConfig(companyId: string): Promise<WebsiteAutoLeadConfig> {
    return this.ensureConfig(companyId);
  }

  async updateConfig(
    companyId: string,
    actorId: string,
    patch: {
      enabled?: boolean;
      employeeIds?: string[];
      effectiveFrom?: string;
    }
  ): Promise<WebsiteAutoLeadConfig> {
    const current = await this.ensureConfig(companyId);
    let employeeIds = current.employeeIds;
    if (Array.isArray(patch.employeeIds)) {
      const unique = [
        ...new Set(
          patch.employeeIds
            .map((id) => String(id ?? "").trim())
            .filter(Boolean)
        ),
      ];
      const active = await this.prisma.employee.findMany({
        where: {
          companyId,
          deletedAt: null,
          status: EmployeeStatus.active,
          id: { in: unique },
        },
        select: { id: true },
      });
      const allowed = new Set(active.map((e) => e.id));
      employeeIds = unique.filter((id) => allowed.has(id));
    }

    const next: WebsiteAutoLeadConfig = {
      enabled: patch.enabled ?? current.enabled,
      employeeIds,
      nextIndex:
        employeeIds.length === 0
          ? 0
          : current.nextIndex % employeeIds.length,
      effectiveFrom:
        typeof patch.effectiveFrom === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(patch.effectiveFrom)
          ? patch.effectiveFrom
          : current.effectiveFrom,
    };

    await this.writeConfig(companyId, actorId, next);
    return next;
  }

  /**
   * Picks the next owner for a brand-new website lead (round-robin).
   * Returns null when disabled, before effectiveFrom, or pool empty.
   */
  async claimNextOwner(companyId: string): Promise<string | null> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const settings = await this.ensureSettingsRow(tx, companyId);
        const meta = asRecord(settings.metadata);
        let cfg =
          parseConfig(meta[META_KEY]) ??
          (await this.bootstrapConfig(tx, companyId));

        if (!cfg.enabled) return null;
        if (todayCairoYmd() < cfg.effectiveFrom) return null;

        const activeIds = await this.filterActiveIds(tx, companyId, cfg.employeeIds);
        if (activeIds.length === 0) return null;

        // Keep rotation order, drop inactive.
        const pool = cfg.employeeIds.filter((id) => activeIds.includes(id));
        if (pool.length === 0) return null;

        const index = cfg.nextIndex % pool.length;
        const ownerId = pool[index]!;
        const next: WebsiteAutoLeadConfig = {
          ...cfg,
          employeeIds: pool,
          nextIndex: (index + 1) % pool.length,
        };

        await tx.companySettings.update({
          where: { companyId },
          data: {
            metadata: {
              ...meta,
              [META_KEY]: next,
            } as Prisma.InputJsonValue,
            updatedBy: "website-auto-assign",
            version: { increment: 1 },
          },
        });

        return ownerId;
      });
    } catch (err) {
      this.logger.warn(
        `website auto-assign failed: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
      return null;
    }
  }

  private async ensureConfig(companyId: string): Promise<WebsiteAutoLeadConfig> {
    return this.prisma.$transaction(async (tx) => {
      const settings = await this.ensureSettingsRow(tx, companyId);
      const meta = asRecord(settings.metadata);
      const existing = parseConfig(meta[META_KEY]);
      if (existing) {
        const active = await this.filterActiveIds(
          tx,
          companyId,
          existing.employeeIds
        );
        const pool = existing.employeeIds.filter((id) => active.includes(id));
        if (
          pool.length === existing.employeeIds.length &&
          existing.employeeIds.length > 0
        ) {
          return existing;
        }
        // Refresh defaults if pool empty.
        if (pool.length === 0) {
          const boot = await this.bootstrapConfig(tx, companyId);
          await this.writeConfigTx(tx, companyId, "system", boot, meta);
          return boot;
        }
        const cleaned: WebsiteAutoLeadConfig = {
          ...existing,
          employeeIds: pool,
          nextIndex: existing.nextIndex % pool.length,
        };
        await this.writeConfigTx(tx, companyId, "system", cleaned, meta);
        return cleaned;
      }
      const boot = await this.bootstrapConfig(tx, companyId);
      await this.writeConfigTx(tx, companyId, "system", boot, meta);
      return boot;
    });
  }

  private async bootstrapConfig(
    tx: Prisma.TransactionClient,
    companyId: string
  ): Promise<WebsiteAutoLeadConfig> {
    const employees = await tx.employee.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: EmployeeStatus.active,
        OR: DEFAULT_NAME_ORDER.map((name) => ({
          name: { equals: name, mode: "insensitive" as const },
        })),
      },
      select: { id: true, name: true },
    });
    const byName = new Map(
      employees.map((e) => [e.name.trim().toLowerCase(), e.id])
    );
    const employeeIds = DEFAULT_NAME_ORDER.map(
      (name) => byName.get(name.toLowerCase()) ?? null
    ).filter((id): id is string => !!id);

    return {
      enabled: true,
      employeeIds,
      nextIndex: 0,
      effectiveFrom: "2026-09-13",
    };
  }

  private async filterActiveIds(
    tx: Prisma.TransactionClient,
    companyId: string,
    ids: string[]
  ): Promise<string[]> {
    if (ids.length === 0) return [];
    const rows = await tx.employee.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: EmployeeStatus.active,
        id: { in: ids },
      },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  private async ensureSettingsRow(
    tx: Prisma.TransactionClient,
    companyId: string
  ) {
    let row = await tx.companySettings.findUnique({ where: { companyId } });
    if (!row) {
      row = await tx.companySettings.create({
        data: {
          companyId,
          companyName: "ROOTK Systems",
          legalName: "ROOTK Systems LLC",
          email: "hr@rootk.systems",
          phone: "+20 2 0000 0000",
          address: "Cairo, Egypt",
          website: "https://rootk.systems",
          timezone: "Africa/Cairo",
          currency: "EGP",
          language: "ar",
          appearance: "system",
          notifications: {},
          createdBy: "system",
          updatedBy: "system",
        },
      });
    }
    return row;
  }

  private async writeConfig(
    companyId: string,
    actorId: string,
    cfg: WebsiteAutoLeadConfig
  ) {
    await this.prisma.$transaction(async (tx) => {
      const settings = await this.ensureSettingsRow(tx, companyId);
      await this.writeConfigTx(
        tx,
        companyId,
        actorId,
        cfg,
        asRecord(settings.metadata)
      );
    });
  }

  private async writeConfigTx(
    tx: Prisma.TransactionClient,
    companyId: string,
    actorId: string,
    cfg: WebsiteAutoLeadConfig,
    meta: Record<string, unknown>
  ) {
    await tx.companySettings.update({
      where: { companyId },
      data: {
        metadata: {
          ...meta,
          [META_KEY]: cfg,
        } as Prisma.InputJsonValue,
        updatedBy: actorId,
        version: { increment: 1 },
      },
    });
  }
}
