import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, UserRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { mapUser } from "../common/mappers";
import { DEFAULT_COMPANY_NOTIFICATIONS } from "../lib/notification-policy";
import { hashPassword } from "../auth/password.util";
import {
  readAdminVisiblePassword,
  withAdminVisiblePassword,
} from "../common/user-password-preview";

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

  /** Admin accounts list — includes last admin-set plaintext password when available. */
  async listAccounts(companyId: string) {
    const rows = await this.prisma.user.findMany({
      where: { companyId, deletedAt: null },
      orderBy: [{ role: "asc" }, { email: "asc" }],
    });
    return rows.map((row) => {
      const user = mapUser(row);
      return {
        ...user,
        loginPassword: readAdminVisiblePassword(row.metadata),
      };
    });
  }

  async setLoginPassword(
    companyId: string,
    actorId: string,
    userId: string,
    password: string
  ) {
    const next = password.trim();
    if (next.length < 6) {
      throw new BadRequestException("Password must be at least 6 characters");
    }

    const row = await this.prisma.user.findFirst({
      where: { id: userId, companyId, deletedAt: null },
    });
    if (!row) throw new NotFoundException("User not found");

    const updated = await this.prisma.user.update({
      where: { id: row.id },
      data: {
        passwordHash: hashPassword(next),
        metadata: withAdminVisiblePassword(row.metadata, next),
        updatedBy: actorId,
        version: { increment: 1 },
      },
    });

    await this.prisma.refreshToken.updateMany({
      where: { userId: row.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return {
      ...mapUser(updated),
      loginPassword: next,
    };
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
