import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from "@nestjs/common";
import {
  TaskPriority,
  TaskStatus,
  WorkOrigin,
  Prisma,
  type WorkMeeting,
  type WorkTask,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { auditFields, dateOnly, iso, parseDate } from "../common/mappers";
import { NotificationsService } from "../notifications/notifications.service";
import { writeActivity } from "../common/activity-writer";
import { TargetsService } from "../targets/targets.service";

type Actor = {
  userId: string;
  role: "admin" | "employee";
  employeeId: string;
};

function normalizeEvidenceUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function isValidEvidenceUrl(url: string): boolean {
  const normalized = normalizeEvidenceUrl(url);
  if (!normalized) return false;
  try {
    const parsed = new URL(normalized);
    return /^https?:\/\//i.test(normalized) && parsed.hostname.includes(".");
  } catch {
    return false;
  }
}

function sanitizeEvidenceLinks(links: unknown): string[] {
  if (!Array.isArray(links)) return [];
  return links
    .map((link) => normalizeEvidenceUrl(String(link ?? "")))
    .filter(isValidEvidenceUrl)
    .slice(0, 10);
}

function assertCompletionEvidence(
  task: WorkTask,
  evidence: { links?: string[]; notes?: string } | undefined,
  actorRole: Actor["role"]
) {
  if (actorRole === "admin") return;
  const requireLinks = task.requireEvidenceLinks;
  const requireNotes = task.requireEvidenceNotes;
  if (!requireLinks && !requireNotes) return;

  const links = sanitizeEvidenceLinks(
    evidence?.links !== undefined ? evidence.links : task.evidenceLinks
  );
  const notes = String(
    evidence?.notes !== undefined
      ? evidence.notes
      : (task.evidenceNotes ?? "")
  ).trim();

  if (requireLinks && links.length === 0) {
    throw new BadRequestException(
      "Proof links are required before completing this task"
    );
  }
  if (requireNotes && notes.length < 3) {
    throw new BadRequestException(
      "Completion notes are required before completing this task"
    );
  }
}

function mapTask(row: WorkTask) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    dueDate: row.dueDate ? iso(row.dueDate) : "",
    tag: row.tag,
    estimateMin: row.estimateMin,
    assigneeIds: row.assigneeIds,
    relatedMeetingId: row.relatedMeetingId ?? undefined,
    targetId: row.targetId ?? undefined,
    subItems: row.subItems ?? [],
    origin: row.origin,
    requireEvidenceLinks: row.requireEvidenceLinks,
    requireEvidenceNotes: row.requireEvidenceNotes,
    evidenceLinks: row.evidenceLinks ?? [],
    evidenceNotes: row.evidenceNotes ?? "",
    ...auditFields(row),
  };
}

function mapMeeting(row: WorkMeeting) {
  return {
    id: row.id,
    title: row.title,
    date: dateOnly(row.date),
    startTime: row.startTime,
    endTime: row.endTime,
    location: row.location,
    organizerId: row.organizerId,
    participantIds: row.participantIds,
    agenda: row.agenda,
    notes: row.notes,
    joinUrl: row.joinUrl ?? undefined,
    origin: row.origin,
    ...auditFields(row),
  };
}

function isPersonal(origin: WorkOrigin | string | null | undefined) {
  return (origin ?? WorkOrigin.assigned) === WorkOrigin.personal;
}

function ownsPersonalTask(task: WorkTask, actor: Actor) {
  if (!isPersonal(task.origin)) return false;
  if (task.assigneeIds.includes(actor.employeeId)) return true;
  if (task.createdBy === actor.employeeId || task.createdBy === actor.userId) {
    return true;
  }
  return false;
}

function ownsPersonalMeeting(meeting: WorkMeeting, actor: Actor) {
  if (!isPersonal(meeting.origin)) return false;
  if (meeting.organizerId === actor.employeeId) return true;
  if (
    meeting.createdBy === actor.employeeId ||
    meeting.createdBy === actor.userId
  ) {
    return true;
  }
  return false;
}

@Injectable()
export class WorkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    @Inject(forwardRef(() => TargetsService))
    private readonly targets: TargetsService
  ) {}

  async listTasks(
    companyId: string,
    actor: Actor,
    filters: {
      employeeId?: string;
      status?: string;
      priority?: string;
      origin?: string;
    } = {}
  ) {
    const where: Prisma.WorkTaskWhereInput = { companyId, deletedAt: null };
    if (filters.status) where.status = filters.status as TaskStatus;
    if (filters.priority) where.priority = filters.priority as TaskPriority;
    if (filters.origin) where.origin = filters.origin as WorkOrigin;
    const employeeId =
      actor.role === "employee"
        ? actor.employeeId
        : filters.employeeId;
    if (employeeId) where.assigneeIds = { has: employeeId };
    const rows = await this.prisma.workTask.findMany({
      where,
      orderBy: { dueDate: "asc" },
    });
    return rows.map(mapTask);
  }

  async taskById(companyId: string, actor: Actor, id: string) {
    const row = await this.prisma.workTask.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!row) return null;
    if (
      actor.role === "employee" &&
      !row.assigneeIds.includes(actor.employeeId)
    ) {
      return null;
    }
    return mapTask(row);
  }

  async createTask(
    companyId: string,
    actor: Actor,
    body: Record<string, unknown>
  ) {
    const isEmployee = actor.role === "employee";
    const origin = isEmployee
      ? WorkOrigin.personal
      : ((body.origin as WorkOrigin) ?? WorkOrigin.assigned);
    const assigneeIds = isEmployee
      ? [actor.employeeId]
      : ((body.assigneeIds as string[]) ?? []);
    if (isEmployee && origin !== WorkOrigin.personal) {
      throw new ForbiddenException("Employees can only create personal tasks");
    }
    const requireEvidenceLinks = isEmployee
      ? false
      : Boolean(body.requireEvidenceLinks);
    const requireEvidenceNotes = isEmployee
      ? false
      : Boolean(body.requireEvidenceNotes);
    const row = await this.prisma.workTask.create({
      data: {
        companyId,
        title: String(body.title ?? ""),
        description: String(body.description ?? ""),
        status: (body.status as TaskStatus) ?? TaskStatus.todo,
        priority: (body.priority as TaskPriority) ?? TaskPriority.medium,
        dueDate: body.dueDate
          ? parseDate(String(body.dueDate))
          : null,
        tag: String(body.tag ?? ""),
        estimateMin: Number(body.estimateMin ?? 0),
        assigneeIds,
        relatedMeetingId: (body.relatedMeetingId as string) ?? undefined,
        targetId: (body.targetId as string) ?? undefined,
        subItems: (body.subItems as object) ?? [],
        origin,
        requireEvidenceLinks,
        requireEvidenceNotes,
        evidenceLinks: sanitizeEvidenceLinks(body.evidenceLinks),
        evidenceNotes: String(body.evidenceNotes ?? ""),
        createdBy: actor.userId,
        updatedBy: actor.userId,
      },
    });

    if (origin === WorkOrigin.assigned && assigneeIds.length > 0) {
      const users = await this.prisma.user.findMany({
        where: {
          companyId,
          employeeId: { in: assigneeIds },
          deletedAt: null,
        },
      });
      await this.notifications.notifyDomain({
        companyId,
        actorId: actor.userId,
        category: "work",
        priority: "normal",
        audience: "employee",
        titleKey: "notifications.taskAssignedTitle",
        bodyKey: "notifications.taskAssignedBody",
        vars: { title: row.title },
        href: "/tasks",
        entityType: "work_task",
        entityId: row.id,
        recipientIds: users.map((u) => u.id),
      });
    }

    return mapTask(row);
  }

  async updateTask(
    companyId: string,
    actor: Actor,
    id: string,
    body: Record<string, unknown>
  ) {
    const current = await this.prisma.workTask.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!current) throw new NotFoundException("Task not found");
    if (actor.role === "employee" && !ownsPersonalTask(current, actor)) {
      throw new ForbiddenException("You can only edit your personal tasks");
    }
    const nextStatus = body.status as TaskStatus | undefined;
    if (
      nextStatus === TaskStatus.completed &&
      current.status !== TaskStatus.completed
    ) {
      assertCompletionEvidence(
        {
          ...current,
          requireEvidenceLinks:
            typeof body.requireEvidenceLinks === "boolean"
              ? body.requireEvidenceLinks
              : current.requireEvidenceLinks,
          requireEvidenceNotes:
            typeof body.requireEvidenceNotes === "boolean"
              ? body.requireEvidenceNotes
              : current.requireEvidenceNotes,
        },
        {
          links: body.evidenceLinks as string[] | undefined,
          notes: body.evidenceNotes as string | undefined,
        },
        actor.role
      );
    }

    const row = await this.prisma.workTask.update({
      where: { id },
      data: {
        title: body.title as string | undefined,
        description: body.description as string | undefined,
        status: nextStatus,
        priority: body.priority as TaskPriority | undefined,
        dueDate:
          body.dueDate === "" || body.dueDate === null
            ? null
            : body.dueDate
              ? parseDate(String(body.dueDate))
              : undefined,
        tag: body.tag as string | undefined,
        estimateMin:
          body.estimateMin !== undefined ? Number(body.estimateMin) : undefined,
        assigneeIds:
          actor.role === "employee"
            ? [actor.employeeId]
            : (body.assigneeIds as string[] | undefined),
        subItems: body.subItems as object | undefined,
        origin:
          actor.role === "employee"
            ? WorkOrigin.personal
            : (body.origin as WorkOrigin | undefined),
        requireEvidenceLinks:
          actor.role === "employee"
            ? undefined
            : typeof body.requireEvidenceLinks === "boolean"
              ? body.requireEvidenceLinks
              : undefined,
        requireEvidenceNotes:
          actor.role === "employee"
            ? undefined
            : typeof body.requireEvidenceNotes === "boolean"
              ? body.requireEvidenceNotes
              : undefined,
        evidenceLinks:
          body.evidenceLinks !== undefined
            ? sanitizeEvidenceLinks(body.evidenceLinks)
            : undefined,
        evidenceNotes:
          body.evidenceNotes !== undefined
            ? String(body.evidenceNotes)
            : undefined,
        updatedBy: actor.userId,
        version: { increment: 1 },
      },
    });

    if (row.targetId && nextStatus && nextStatus !== current.status) {
      await this.targets.onLinkedTaskStatusChanged(
        companyId,
        row.id,
        actor.userId
      );
    }

    return mapTask(row);
  }

  async updateTaskStatus(
    companyId: string,
    actor: Actor,
    id: string,
    status: string,
    evidence?: { links?: string[]; notes?: string }
  ) {
    const current = await this.prisma.workTask.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!current) throw new NotFoundException("Task not found");
    if (
      actor.role === "employee" &&
      !current.assigneeIds.includes(actor.employeeId)
    ) {
      throw new ForbiddenException("You can only update tasks assigned to you");
    }
    if (actor.role === "employee" && ownsPersonalTask(current, actor)) {
      return this.updateTask(companyId, actor, id, {
        status,
        evidenceLinks: evidence?.links,
        evidenceNotes: evidence?.notes,
      });
    }

    if (
      status === TaskStatus.completed &&
      current.status !== TaskStatus.completed
    ) {
      assertCompletionEvidence(current, evidence, actor.role);
    }

    const evidenceLinks =
      evidence?.links !== undefined
        ? sanitizeEvidenceLinks(evidence.links)
        : undefined;
    const evidenceNotes =
      evidence?.notes !== undefined ? String(evidence.notes).trim() : undefined;

    const row = await this.prisma.workTask.update({
      where: { id },
      data: {
        status: status as TaskStatus,
        ...(evidenceLinks !== undefined ? { evidenceLinks } : {}),
        ...(evidenceNotes !== undefined ? { evidenceNotes } : {}),
        updatedBy: actor.userId,
        version: { increment: 1 },
      },
    });

    if (
      status === "completed" &&
      current.status !== TaskStatus.completed &&
      !isPersonal(current.origin)
    ) {
      await this.notifications.notifyDomain({
        companyId,
        actorId: actor.userId,
        category: "work",
        priority: "normal",
        audience: "admin",
        titleKey: "notifications.taskCompletedTitle",
        bodyKey: "notifications.taskCompletedBody",
        vars: { title: row.title },
        href: "/tasks",
        entityType: "work_task",
        entityId: row.id,
      });
      await writeActivity(this.prisma, {
        companyId,
        type: "announcement",
        title: "Task completed",
        description: row.title,
        employeeId: actor.employeeId,
        actorId: actor.userId,
      });
    }

    if (row.targetId && current.status !== row.status) {
      await this.targets.onLinkedTaskStatusChanged(
        companyId,
        row.id,
        actor.userId
      );
    }

    return mapTask(row);
  }

  async toggleSubItem(
    companyId: string,
    actor: Actor,
    id: string,
    subId: string
  ) {
    const current = await this.prisma.workTask.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!current) throw new NotFoundException("Task not found");
    if (
      actor.role === "employee" &&
      !current.assigneeIds.includes(actor.employeeId)
    ) {
      throw new ForbiddenException("You can only update tasks assigned to you");
    }
    const items = Array.isArray(current.subItems)
      ? [...(current.subItems as Array<Record<string, unknown>>)]
      : [];
    const next = items.map((s) =>
      s && s.id === subId ? { ...s, done: !s.done } : s
    );
    const row = await this.prisma.workTask.update({
      where: { id },
      data: {
        subItems: next as Prisma.InputJsonValue,
        updatedBy: actor.userId,
        version: { increment: 1 },
      },
    });
    return mapTask(row);
  }

  async deleteTask(companyId: string, actor: Actor, id: string) {
    const current = await this.prisma.workTask.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!current) throw new NotFoundException("Task not found");
    if (actor.role === "employee" && !ownsPersonalTask(current, actor)) {
      throw new ForbiddenException("You can only delete your personal tasks");
    }
    await this.prisma.workTask.update({
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
      actor.role === "employee"
        ? actor.employeeId
        : filters.employeeId;
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
      new Set([
        organizerId,
        ...((body.participantIds as string[]) ?? []),
      ])
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
        origin:
          actor.role === "employee" ? WorkOrigin.personal : undefined,
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
