import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { WorkOrigin, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { parseDate } from "../common/mappers";
import { NotificationsService } from "../notifications/notifications.service";
import {
  mapMeeting,
  ownsPersonalMeeting,
  type Actor,
} from "./work-mappers";

export type { Actor };

/** Meeting-related business logic extracted from `WorkService`. */
@Injectable()
export class WorkMeetingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService
  ) {}

  async listMeetings(
    companyId: string,
    actor: Actor,
    filters: {
      employeeId?: string;
      date?: string;
      from?: string;
      to?: string;
    } = {}
  ) {
    const where: Prisma.WorkMeetingWhereInput = { companyId, deletedAt: null };
    if (filters.date) where.date = parseDate(filters.date);
    if (filters.from || filters.to) {
      where.date = {
        ...(filters.from ? { gte: parseDate(filters.from) } : {}),
        ...(filters.to ? { lte: parseDate(filters.to) } : {}),
      };
    }
    let rows = await this.prisma.workMeeting.findMany({
      where,
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });
    const employeeId =
      actor.role === "employee" ? actor.employeeId : filters.employeeId;
    if (employeeId) {
      rows = rows.filter(
        (m) =>
          m.organizerId === employeeId || m.participantIds.includes(employeeId)
      );
    }
    return rows.map(mapMeeting);
  }

  async createMeeting(
    companyId: string,
    actor: Actor,
    body: Record<string, unknown>
  ) {
    const isEmployee = actor.role === "employee";
    const organizerId = isEmployee
      ? actor.employeeId
      : String(body.organizerId ?? actor.employeeId);
    const participantIds = Array.from(
      new Set([organizerId, ...((body.participantIds as string[]) ?? [])])
    );
    const origin = isEmployee
      ? WorkOrigin.personal
      : ((body.origin as WorkOrigin) ?? WorkOrigin.assigned);
    const row = await this.prisma.workMeeting.create({
      data: {
        companyId,
        title: String(body.title ?? ""),
        date: parseDate(String(body.date ?? new Date().toISOString())),
        startTime: String(body.startTime ?? "09:00"),
        endTime: String(body.endTime ?? "10:00"),
        location: String(body.location ?? ""),
        organizerId,
        participantIds,
        agenda: (body.agenda as string[]) ?? [],
        notes: String(body.notes ?? ""),
        joinUrl: (body.joinUrl as string) ?? undefined,
        origin,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      },
    });

    if (origin === WorkOrigin.assigned && participantIds.length > 0) {
      const users = await this.prisma.user.findMany({
        where: {
          companyId,
          employeeId: { in: participantIds },
          deletedAt: null,
          isActive: true,
        },
        select: { id: true },
      });
      const recipients = users
        .map((u) => u.id)
        .filter((id) => id !== actor.userId);
      if (recipients.length > 0) {
        await this.notifications.notifyDomain({
          companyId,
          actorId: actor.userId,
          category: "work",
          priority: "normal",
          audience: "employee",
          titleKey: "notifications.meetingInviteTitle",
          bodyKey: "notifications.meetingInviteBody",
          vars: { title: row.title },
          href: "/tasks?tab=meetings",
          entityType: "work_meeting",
          entityId: row.id,
          recipientIds: recipients,
        });
      }
    }

    return mapMeeting(row);
  }

  async updateMeeting(
    companyId: string,
    actor: Actor,
    id: string,
    body: Record<string, unknown>
  ) {
    const current = await this.prisma.workMeeting.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!current) throw new NotFoundException("Meeting not found");
    if (actor.role === "employee" && !ownsPersonalMeeting(current, actor)) {
      throw new ForbiddenException("You can only edit your personal meetings");
    }
    const organizerId =
      actor.role === "employee"
        ? actor.employeeId
        : ((body.organizerId as string | undefined) ?? undefined);
    let participantIds = body.participantIds as string[] | undefined;
    if (actor.role === "employee") {
      participantIds = Array.from(
        new Set([
          actor.employeeId,
          ...((body.participantIds as string[]) ?? current.participantIds),
        ])
      );
    }
    const row = await this.prisma.workMeeting.update({
      where: { id },
      data: {
        title: body.title as string | undefined,
        date: body.date ? parseDate(String(body.date)) : undefined,
        startTime: body.startTime as string | undefined,
        endTime: body.endTime as string | undefined,
        location: body.location as string | undefined,
        organizerId,
        participantIds,
        agenda: body.agenda as string[] | undefined,
        notes: body.notes as string | undefined,
        joinUrl: body.joinUrl as string | undefined,
        origin: actor.role === "employee" ? WorkOrigin.personal : undefined,
        updatedBy: actor.userId,
        version: { increment: 1 },
      },
    });
    return mapMeeting(row);
  }

  async deleteMeeting(companyId: string, actor: Actor, id: string) {
    const current = await this.prisma.workMeeting.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!current) throw new NotFoundException("Meeting not found");
    if (actor.role === "employee" && !ownsPersonalMeeting(current, actor)) {
      throw new ForbiddenException("You can only delete your personal meetings");
    }
    await this.prisma.workMeeting.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isArchived: true,
        updatedBy: actor.userId,
        version: { increment: 1 },
      },
    });
    return true;
  }
}
