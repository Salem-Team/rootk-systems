import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { auditFields } from "../common/mappers";
import {
  DEFAULT_COMPANY_NOTIFICATIONS,
  normalizeCompanyNotifications,
} from "../lib/notification-policy";

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  private map(row: {
    id: string;
    companyId: string;
    companyName: string;
    legalName: string;
    email: string;
    phone: string;
    address: string;
    website: string;
    timezone: string;
    currency: string;
    language: string;
    appearance: string;
    notifications: unknown;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string | null;
    updatedBy: string | null;
    deletedAt: Date | null;
    isArchived: boolean;
    version: number;
    metadata: unknown;
  }) {
    return {
      id: row.id,
      name: row.companyName,
      legalName: row.legalName,
      email: row.email,
      phone: row.phone,
      address: row.address,
      website: row.website,
      timezone: row.timezone,
      currency: row.currency,
      language: row.language,
      appearance: row.appearance,
      notifications: normalizeCompanyNotifications(
        row.notifications as never
      ),
      ...auditFields(row),
    };
  }

  private async ensure(companyId: string, actorId = "system") {
    let row = await this.prisma.companySettings.findUnique({
      where: { companyId },
    });
    if (!row) {
      row = await this.prisma.companySettings.create({
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
          notifications: DEFAULT_COMPANY_NOTIFICATIONS as unknown as Prisma.InputJsonValue,
          createdBy: actorId,
          updatedBy: actorId,
        },
      });
    }
    return row;
  }

  async get(companyId: string) {
    const row = await this.ensure(companyId);
    return this.map(row);
  }

  async patch(companyId: string, actorId: string, body: Record<string, unknown>) {
    const current = await this.ensure(companyId, actorId);
    const nextNotifications =
      body.notifications !== undefined
        ? normalizeCompanyNotifications({
            ...normalizeCompanyNotifications(current.notifications as never),
            ...(body.notifications as object),
          })
        : undefined;

    const companyName =
      (body.name as string | undefined) ??
      (body.companyName as string | undefined);

    const row = await this.prisma.companySettings.update({
      where: { companyId },
      data: {
        companyName,
        legalName: body.legalName as string | undefined,
        email: body.email as string | undefined,
        phone: body.phone as string | undefined,
        address: body.address as string | undefined,
        website: body.website as string | undefined,
        timezone: body.timezone as string | undefined,
        currency: body.currency as string | undefined,
        language: body.language as string | undefined,
        appearance: body.appearance as string | undefined,
        notifications: nextNotifications as Prisma.InputJsonValue | undefined,
        updatedBy: actorId,
        version: { increment: 1 },
      },
    });
    return this.map(row);
  }
}
