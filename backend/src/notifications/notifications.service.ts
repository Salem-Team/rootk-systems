import { Injectable, NotFoundException } from "@nestjs/common";
import {
  NotificationAudience,
  NotificationCategory,
  NotificationPriority,
  Prisma,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { auditFields } from "../common/mappers";
import {
  companyAllowsCategory,
  normalizeCompanyNotifications,
} from "../lib/notification-policy";

function mapNotification(row: {
  id: string;
  companyId: string;
  titleKey: string;
  bodyKey: string;
  vars: unknown;
  category: NotificationCategory;
  priority: NotificationPriority;
  audience: NotificationAudience;
  recipientIds: string[];
  href: string | null;
  entityType: string | null;
  entityId: string | null;
  actorId: string | null;
  readBy: string[];
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
    titleKey: row.titleKey,
    bodyKey: row.bodyKey,
    vars: row.vars ?? undefined,
    category: row.category,
    priority: row.priority,
    audience: row.audience,
    recipientIds: row.recipientIds,
    href: row.href ?? undefined,
    entityType: row.entityType ?? undefined,
    entityId: row.entityId ?? undefined,
    actorId: row.actorId ?? undefined,
    readBy: row.readBy,
    ...auditFields(row),
  };
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    companyId: string,
    userId: string,
    role: string,
    filters: { category?: string; unreadOnly?: string } = {}
  ) {
    const audience =
      role === "admin"
        ? { in: [NotificationAudience.all, NotificationAudience.admin] as NotificationAudience[] }
        : { in: [NotificationAudience.all, NotificationAudience.employee] as NotificationAudience[] };

    const where: Prisma.AppNotificationWhereInput = {
      companyId,
      deletedAt: null,
      OR: [
        { audience },
        { recipientIds: { has: userId } },
      ],
    };
    if (filters.category) {
      where.category = filters.category as NotificationCategory;
    }

    let rows = await this.prisma.appNotification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    if (filters.unreadOnly === "true" || filters.unreadOnly === "1") {
      rows = rows.filter((r) => !r.readBy.includes(userId));
    }
    return rows.map(mapNotification);
  }

  async create(companyId: string, actorId: string, body: Record<string, unknown>) {
    const row = await this.prisma.appNotification.create({
      data: {
        companyId,
        titleKey: String(body.titleKey ?? ""),
        bodyKey: String(body.bodyKey ?? ""),
        vars: (body.vars as object) ?? undefined,
        category: (body.category as NotificationCategory) ?? NotificationCategory.system,
        priority: (body.priority as NotificationPriority) ?? NotificationPriority.normal,
        audience: (body.audience as NotificationAudience) ?? NotificationAudience.all,
        recipientIds: (body.recipientIds as string[]) ?? [],
        href: (body.href as string) ?? undefined,
        entityType: (body.entityType as string) ?? undefined,
        entityId: (body.entityId as string) ?? undefined,
        actorId: (body.actorId as string) ?? actorId,
        readBy: [],
        createdBy: actorId,
        updatedBy: actorId,
      },
    });
    return mapNotification(row);
  }

  /** Domain producers — respects company notification policy. */
  async notifyDomain(input: {
    companyId: string;
    actorId: string;
    category: NotificationCategory | string;
    priority?: NotificationPriority | string;
    audience: NotificationAudience | string;
    titleKey: string;
    bodyKey: string;
    vars?: Record<string, unknown>;
    href?: string;
    entityType?: string;
    entityId?: string;
    recipientIds?: string[];
  }) {
    const settings = await this.prisma.companySettings.findUnique({
      where: { companyId: input.companyId },
    });
    const policy = normalizeCompanyNotifications(
      settings?.notifications as never
    );
    if (!companyAllowsCategory(policy, String(input.category))) {
      return null;
    }
    return this.create(input.companyId, input.actorId, {
      titleKey: input.titleKey,
      bodyKey: input.bodyKey,
      vars: input.vars,
      category: input.category,
      priority: input.priority ?? "normal",
      audience: input.audience,
      recipientIds: input.recipientIds ?? [],
      href: input.href,
      entityType: input.entityType,
      entityId: input.entityId,
      actorId: input.actorId,
    });
  }

  async markRead(companyId: string, userId: string, id: string) {
    const current = await this.prisma.appNotification.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!current) throw new NotFoundException("Notification not found");
    const readBy = current.readBy.includes(userId)
      ? current.readBy
      : [...current.readBy, userId];
    const row = await this.prisma.appNotification.update({
      where: { id },
      data: { readBy, updatedBy: userId, version: { increment: 1 } },
    });
    return mapNotification(row);
  }

  async markAll(companyId: string, userId: string, role: string) {
    const items = await this.list(companyId, userId, role);
    for (const item of items) {
      if (!item.readBy.includes(userId)) {
        await this.markRead(companyId, userId, item.id);
      }
    }
    return this.list(companyId, userId, role);
  }
}
