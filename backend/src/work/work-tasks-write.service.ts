import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from "@nestjs/common";
import { TaskPriority, TaskStatus, WorkOrigin, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { parseDate } from "../common/mappers";
import { NotificationsService } from "../notifications/notifications.service";
import { syncAssigneeProgress } from "../lib/task-assignee-progress";
import {
  mapTask,
  sanitizeEvidenceLinks,
  resolveTaskAssigneeProgress,
  type Actor,
} from "./work-mappers";
import { assertCanAssignToTeam } from "../lib/team";
import { assertCanMutateWorkTask } from "./work-access";
import {
  parseStoredMedia,
  resolveTaskMediaPayload,
  deleteCompanyTaskMedia,
  readCompanyTaskMedia,
} from "./work-task-media-storage";

export type { Actor };

/** Task create/delete/sub-item flows extracted from `WorkTasksService`. */
@Injectable()
export class WorkTasksWriteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService
  ) {}

  async createTask(
    companyId: string,
    actor: Actor,
    body: Record<string, unknown>
  ) {
    const isEmployee = actor.role === "employee";
    const requestedAssignees = Array.isArray(body.assigneeIds)
      ? (body.assigneeIds as string[]).map(String).filter(Boolean)
      : [];
    const wantsTeamAssign =
      isEmployee &&
      body.origin === WorkOrigin.assigned &&
      requestedAssignees.length > 0;
    if (wantsTeamAssign) {
      await assertCanAssignToTeam(
        this.prisma,
        companyId,
        actor,
        requestedAssignees
      );
    }
    const origin = wantsTeamAssign
      ? WorkOrigin.assigned
      : isEmployee
        ? WorkOrigin.personal
        : ((body.origin as WorkOrigin) ?? WorkOrigin.assigned);
    const assigneeIds = wantsTeamAssign
      ? requestedAssignees
      : isEmployee
        ? [actor.employeeId]
        : requestedAssignees;
    if (isEmployee && origin !== WorkOrigin.personal && !wantsTeamAssign) {
      throw new ForbiddenException("Employees can only create personal tasks");
    }
    const requireEvidenceLinks =
      isEmployee && !wantsTeamAssign
        ? false
        : Boolean(body.requireEvidenceLinks);
    const requireEvidenceNotes =
      isEmployee && !wantsTeamAssign
        ? false
        : Boolean(body.requireEvidenceNotes);
    const requireEvidenceMedia =
      isEmployee && !wantsTeamAssign
        ? false
        : Boolean(body.requireEvidenceMedia);
    const now = new Date();
    const initialStatus = (body.status as TaskStatus) ?? TaskStatus.todo;
    const evidenceLinks = sanitizeEvidenceLinks(body.evidenceLinks);
    const evidenceNotes = String(body.evidenceNotes ?? "");
    const media = await resolveTaskMediaPayload(
      companyId,
      body.media,
      []
    );
    const assigneeProgress = syncAssigneeProgress(assigneeIds, [], {
      status: initialStatus,
      completedAt:
        initialStatus === TaskStatus.completed ? now.toISOString() : null,
      evidenceLinks,
      evidenceNotes,
    });
    const row = await this.prisma.workTask.create({
      data: {
        companyId,
        title: String(body.title ?? ""),
        description: String(body.description ?? ""),
        status: initialStatus,
        priority: (body.priority as TaskPriority) ?? TaskPriority.medium,
        dueDate: body.dueDate ? parseDate(String(body.dueDate)) : null,
        tag: String(body.tag ?? ""),
        estimateMin: Number(body.estimateMin ?? 0),
        assigneeIds,
        assigneeProgress: assigneeProgress as unknown as Prisma.InputJsonValue,
        relatedMeetingId: (body.relatedMeetingId as string) ?? undefined,
        targetId: (body.targetId as string) ?? undefined,
        subItems: (body.subItems as object) ?? [],
        origin,
        requireEvidenceLinks,
        requireEvidenceNotes,
        requireEvidenceMedia,
        evidenceLinks,
        evidenceNotes,
        evidenceMedia: [] as unknown as Prisma.InputJsonValue,
        media: media as unknown as Prisma.InputJsonValue,
        assignedAt: now,
        completedAt: initialStatus === TaskStatus.completed ? now : null,
        projectId:
          typeof body.projectId === "string" && body.projectId.trim()
            ? body.projectId.trim()
            : null,
        phaseId:
          typeof body.phaseId === "string" && body.phaseId.trim()
            ? body.phaseId.trim()
            : null,
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
        href: `/tasks?tab=tasks&task=${row.id}`,
        entityType: "work_task",
        entityId: row.id,
        recipientIds: users.map((u) => u.id),
      });
    }

    return mapTask(row, actor);
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
    return mapTask(row, actor);
  }

  async deleteTask(companyId: string, actor: Actor, id: string) {
    const current = await this.prisma.workTask.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!current) throw new NotFoundException("Task not found");
    await assertCanMutateWorkTask(this.prisma, companyId, actor, current, "delete");
    for (const item of parseStoredMedia(current.media)) {
      await deleteCompanyTaskMedia(companyId, item.id);
    }
    for (const item of parseStoredMedia(current.evidenceMedia)) {
      await deleteCompanyTaskMedia(companyId, item.id);
    }
    await this.prisma.workTask.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isArchived: true,
        media: [] as unknown as Prisma.InputJsonValue,
        evidenceMedia: [] as unknown as Prisma.InputJsonValue,
        updatedBy: actor.userId,
        version: { increment: 1 },
      },
    });
    return true;
  }

  async streamTaskMedia(
    companyId: string,
    actor: Actor,
    taskId: string,
    fileId: string
  ) {
    const current = await this.prisma.workTask.findFirst({
      where: { id: taskId, companyId, deletedAt: null },
    });
    if (!current) throw new NotFoundException("Task not found");
    if (
      actor.role === "employee" &&
      !current.assigneeIds.includes(actor.employeeId)
    ) {
      throw new ForbiddenException("You can only view media for your tasks");
    }
    const fromBrief = parseStoredMedia(current.media).find((m) => m.id === fileId);
    const fromEvidence = parseStoredMedia(current.evidenceMedia).find(
      (m) => m.id === fileId
    );
    const fromProgress = resolveTaskAssigneeProgress(current)
      .flatMap((p) => p.evidenceMedia ?? [])
      .find((m) => m.id === fileId);
    const item = fromBrief ?? fromEvidence ?? fromProgress;
    if (!item) throw new NotFoundException("Media not found");
    const buffer = await readCompanyTaskMedia(companyId, fileId);
    return {
      file: new StreamableFile(buffer),
      mime: item.mime,
    };
  }
}
