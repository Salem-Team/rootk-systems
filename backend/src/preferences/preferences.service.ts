import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { iso } from "../common/mappers";
import {
  DEFAULT_COMPANY_NOTIFICATIONS,
  normalizeCompanyNotifications,
  type CompanyNotificationSettings,
} from "../lib/notification-policy";

const DEFAULT_PERSONAL_NOTIFICATIONS = {
  ...DEFAULT_COMPANY_NOTIFICATIONS,
  sound: true,
};

function prefsFromCompany(company: CompanyNotificationSettings) {
  return {
    email: company.email,
    push: company.push,
    sound: true,
    attendanceReminders: company.attendanceReminders,
    leaveUpdates: company.leaveUpdates,
    announcements: company.announcements,
    system: company.system,
    work: company.work,
    payroll: company.payroll,
    schedule: company.schedule,
    mention: company.mention,
  };
}

function notificationsDiffer(
  userRaw: unknown,
  company: CompanyNotificationSettings
): boolean {
  const user = normalizeCompanyNotifications(userRaw as never);
  const keys: Array<keyof CompanyNotificationSettings> = [
    "email",
    "push",
    "sound",
    "attendanceReminders",
    "leaveUpdates",
    "announcements",
    "system",
    "work",
    "payroll",
    "schedule",
    "mention",
  ];
  return keys.some((k) => Boolean(user[k]) !== Boolean(company[k]));
}

function mapPrefs(row: {
  id: string;
  userId: string;
  companyId: string;
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
    userId: row.userId,
    language: row.language,
    appearance: row.appearance,
    notifications: {
      ...DEFAULT_PERSONAL_NOTIFICATIONS,
      ...(typeof row.notifications === "object" && row.notifications
        ? (row.notifications as object)
        : {}),
    },
    companyId: row.companyId,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    createdBy: row.createdBy ?? "",
    updatedBy: row.updatedBy ?? "",
    deletedAt: row.deletedAt ? iso(row.deletedAt) : null,
    isArchived: row.isArchived,
    version: row.version,
    metadata: row.metadata ?? {},
  };
}

@Injectable()
export class PreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  private async companyPolicy(companyId: string) {
    const settings = await this.prisma.companySettings.findUnique({
      where: { companyId },
    });
    return normalizeCompanyNotifications(settings?.notifications as never);
  }

  async employeeRows(companyId: string) {
    const [prefs, settings, employees] = await Promise.all([
      this.prisma.userPreferences.findMany({
        where: { companyId, deletedAt: null },
        include: { user: true },
      }),
      this.prisma.companySettings.findUnique({ where: { companyId } }),
      this.prisma.employee.findMany({
        where: { companyId, deletedAt: null },
      }),
    ]);

    const companyLanguage = settings?.language ?? "ar";
    const companyAppearance = settings?.appearance ?? "system";
    const companyNotifs = normalizeCompanyNotifications(
      settings?.notifications as never
    );
    const empById = new Map(employees.map((e) => [e.id, e]));

    return prefs
      .filter((p) => p.user.role === "employee" && !p.user.deletedAt)
      .map((p) => {
        const emp = p.user.employeeId
          ? empById.get(p.user.employeeId)
          : undefined;
        const language = p.language || companyLanguage;
        const appearance = p.appearance || companyAppearance;
        const differsFromCompany =
          language !== companyLanguage ||
          appearance !== companyAppearance ||
          notificationsDiffer(p.notifications, companyNotifs);
        return {
          userId: p.userId,
          employeeId: p.user.employeeId ?? emp?.id ?? "",
          name:
            emp?.name ||
            p.user.displayName ||
            `${p.user.firstName ?? ""} ${p.user.lastName ?? ""}`.trim() ||
            p.user.email,
          email: p.user.email,
          language,
          appearance,
          updatedAt: iso(p.updatedAt),
          differsFromCompany,
        };
      });
  }

  async resetEmployeeNotifications(
    companyId: string,
    actorId: string,
    userId: string
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, companyId, deletedAt: null },
    });
    if (!user) throw new NotFoundException("User not found");

    const policy = await this.companyPolicy(companyId);
    const notifications = prefsFromCompany(policy) as unknown as Prisma.InputJsonValue;

    const existing = await this.prisma.userPreferences.findUnique({
      where: { userId },
    });
    const row = existing
      ? await this.prisma.userPreferences.update({
          where: { userId },
          data: {
            notifications,
            updatedBy: actorId,
            version: { increment: 1 },
          },
        })
      : await this.prisma.userPreferences.create({
          data: {
            companyId,
            userId,
            language: "ar",
            appearance: "system",
            notifications,
            createdBy: actorId,
            updatedBy: actorId,
          },
        });
    return mapPrefs(row);
  }

  async resetAllEmployeeNotifications(companyId: string, actorId: string) {
    const policy = await this.companyPolicy(companyId);
    const target = prefsFromCompany(policy);
    const prefs = await this.prisma.userPreferences.findMany({
      where: { companyId, deletedAt: null },
      include: { user: true },
    });

    let resetCount = 0;
    for (const pref of prefs) {
      if (pref.user.role !== "employee" || pref.user.deletedAt) continue;
      if (!notificationsDiffer(pref.notifications, policy)) continue;
      await this.prisma.userPreferences.update({
        where: { id: pref.id },
        data: {
          notifications: target as unknown as Prisma.InputJsonValue,
          updatedBy: actorId,
          version: { increment: 1 },
        },
      });
      resetCount += 1;
    }
    return { resetCount };
  }
}
