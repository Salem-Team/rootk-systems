import { Injectable } from "@nestjs/common";
import { Prisma, UserRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { mapUser } from "../common/mappers";
import { DEFAULT_COMPANY_NOTIFICATIONS } from "../lib/notification-policy";

const DEFAULT_NOTIFICATIONS = {
  ...DEFAULT_COMPANY_NOTIFICATIONS,
  sound: true,
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(companyId: string, role?: string) {
    const rows = await this.prisma.user.findMany({
      where: {
        companyId,
        deletedAt: null,
        ...(role ? { role: role as UserRole } : {}),
      },
      orderBy: { email: "asc" },
    });
    return rows.map(mapUser);
  }

  async byId(companyId: string, id: string) {
    const row = await this.prisma.user.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    return row ? mapUser(row) : null;
  }

  async getPreferences(companyId: string, userId: string) {
    let row = await this.prisma.userPreferences.findUnique({ where: { userId } });
    if (!row || row.companyId !== companyId) {
      row = await this.prisma.userPreferences.create({
        data: {
          companyId,
          userId,
          language: "ar",
          appearance: "system",
          notifications: DEFAULT_NOTIFICATIONS as unknown as Prisma.InputJsonValue,
          createdBy: userId,
          updatedBy: userId,
        },
      });
    }
    return {
      id: row.id,
      userId: row.userId,
      language: row.language,
      appearance: row.appearance,
      notifications: row.notifications,
      companyId: row.companyId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      createdBy: row.createdBy ?? "",
      updatedBy: row.updatedBy ?? "",
      deletedAt: row.deletedAt?.toISOString() ?? null,
      isArchived: row.isArchived,
      version: row.version,
      metadata: row.metadata ?? {},
    };
  }

  async savePreferences(
    companyId: string,
    userId: string,
    actorId: string,
    body: Record<string, unknown>
  ) {
    await this.getPreferences(companyId, userId);
    const current = await this.prisma.userPreferences.findUniqueOrThrow({
      where: { userId },
    });
    const notif = {
      ...(typeof current.notifications === "object" && current.notifications
        ? (current.notifications as object)
        : DEFAULT_NOTIFICATIONS),
      ...((body.notifications as object) ?? {}),
    };
    await this.prisma.userPreferences.update({
      where: { userId },
      data: {
        language: (body.language as string) ?? undefined,
        appearance: (body.appearance as string) ?? undefined,
        notifications: notif as unknown as Prisma.InputJsonValue,
        updatedBy: actorId,
        version: { increment: 1 },
      },
    });
    return this.getPreferences(companyId, userId);
  }

  async ensurePreferences(companyId: string, userId: string) {
    return this.getPreferences(companyId, userId);
  }
}
