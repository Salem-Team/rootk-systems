import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from "@nestjs/common";
import { TaskPriority, TaskStatus, WorkOrigin } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { parseDate } from "../common/mappers";
import { NotificationsService } from "../notifications/notifications.service";
import { writeActivity } from "../common/activity-writer";
import { TargetsService } from "../targets/targets.service";
import {
  assertCompletionEvidence,
  completionTimestampPatch,
  isPersonal,
  mapTask,
  ownsPersonalTask,
  sanitizeEvidenceLinks,
  type Actor,
} from "./work-mappers";

export type { Actor };

/** Task update/status-transition flows extracted from `WorkTasksService`. */
@Injectable()
export class WorkTasksStatusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    @Inject(forwardRef(() => TargetsService))
    private readonly targets: TargetsService
  ) {}

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
        ...completionTimestampPatch(nextStatus, current.status),
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
        ...completionTimestampPatch(status, current.status),
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
}
