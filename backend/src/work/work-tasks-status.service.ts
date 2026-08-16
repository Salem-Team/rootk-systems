import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from "@nestjs/common";
import { Prisma, TaskPriority, TaskStatus, WorkOrigin } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { parseDate } from "../common/mappers";
import { NotificationsService } from "../notifications/notifications.service";
import { writeActivity } from "../common/activity-writer";
import { TargetsService } from "../targets/targets.service";
import {
  applyAssigneeStatusChange,
  applyStatusToAllAssignees,
  findAssigneeProgress,
  syncAssigneeProgress,
} from "../lib/task-assignee-progress";
import {
  assertCompletionEvidence,
  isPersonal,
  mapTask,
  ownsPersonalTask,
  resolveTaskAssigneeProgress,
  rollupCompletedAtDate,
  rollupTaskStatus,
  sanitizeEvidenceLinks,
  taskAssigneeCompletionSummary,
  type Actor,
} from "./work-mappers";
import { assertCanMutateWorkTask, canWidenTaskAssignees } from "./work-access";

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
    await assertCanMutateWorkTask(this.prisma, companyId, actor, current, "edit");

    const nextAssigneeIds = !canWidenTaskAssignees(actor)
      ? current.assigneeIds.includes(actor.employeeId)
        ? current.assigneeIds
        : [actor.employeeId]
      : Array.isArray(body.assigneeIds)
        ? (body.assigneeIds as string[]).map(String).filter(Boolean)
        : current.assigneeIds;

    const nextStatus = body.status as TaskStatus | undefined;
    let progress = syncAssigneeProgress(
      nextAssigneeIds,
      resolveTaskAssigneeProgress(current),
      { status: TaskStatus.todo }
    );

    if (nextStatus && nextStatus !== current.status) {
      if (actor.role === "admin") {
        if (nextStatus === TaskStatus.completed) {
          assertCompletionEvidence(
            {
              requireEvidenceLinks:
                typeof body.requireEvidenceLinks === "boolean"
                  ? body.requireEvidenceLinks
                  : current.requireEvidenceLinks,
              evidenceLinks: current.evidenceLinks,
              evidenceNotes: current.evidenceNotes,
            },
            {
              links: body.evidenceLinks as string[] | undefined,
              notes: body.evidenceNotes as string | undefined,
            },
            actor.role
          );
        }
        progress = applyStatusToAllAssignees(progress, nextStatus, {
          links:
            body.evidenceLinks !== undefined
              ? sanitizeEvidenceLinks(body.evidenceLinks)
              : undefined,
          notes:
            body.evidenceNotes !== undefined
              ? String(body.evidenceNotes)
              : undefined,
        });
      } else {
        const mine = findAssigneeProgress(progress, actor.employeeId);
        if (
          nextStatus === TaskStatus.completed &&
          mine?.status !== TaskStatus.completed
        ) {
          assertCompletionEvidence(
            {
              ...current,
              evidenceLinks: mine?.evidenceLinks ?? current.evidenceLinks,
              evidenceNotes: mine?.evidenceNotes ?? current.evidenceNotes,
            },
            {
              links: body.evidenceLinks as string[] | undefined,
              notes: body.evidenceNotes as string | undefined,
            },
            actor.role
          );
        }
        progress = applyAssigneeStatusChange(
          progress,
          actor.employeeId,
          nextStatus,
          {
            links:
              body.evidenceLinks !== undefined
                ? sanitizeEvidenceLinks(body.evidenceLinks)
                : undefined,
            notes:
              body.evidenceNotes !== undefined
                ? String(body.evidenceNotes)
                : undefined,
          }
        );
      }
    } else if (
      (body.evidenceLinks !== undefined || body.evidenceNotes !== undefined) &&
      actor.role === "employee"
    ) {
      const mine = findAssigneeProgress(progress, actor.employeeId);
      progress = applyAssigneeStatusChange(
        progress,
        actor.employeeId,
        mine?.status ?? current.status,
        {
          links:
            body.evidenceLinks !== undefined
              ? sanitizeEvidenceLinks(body.evidenceLinks)
              : undefined,
          notes:
            body.evidenceNotes !== undefined
              ? String(body.evidenceNotes)
              : undefined,
        }
      );
    }

    const rolledStatus = rollupTaskStatus(progress);
    const rolledCompletedAt = rollupCompletedAtDate(progress);
    const primaryEvidence =
      progress.find((p) => p.status === TaskStatus.completed) ?? progress[0];

    const row = await this.prisma.workTask.update({
      where: { id },
      data: {
        title: body.title as string | undefined,
        description: body.description as string | undefined,
        status: rolledStatus,
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
        assigneeIds: nextAssigneeIds,
        assigneeProgress: progress as unknown as Prisma.InputJsonValue,
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
            : (primaryEvidence?.evidenceLinks as string[] | undefined),
        evidenceNotes:
          body.evidenceNotes !== undefined
            ? String(body.evidenceNotes)
            : primaryEvidence?.evidenceNotes,
        completedAt: rolledCompletedAt,
        updatedBy: actor.userId,
        version: { increment: 1 },
      },
    });

    if (row.targetId && rolledStatus !== current.status) {
      await this.targets.onLinkedTaskStatusChanged(
        companyId,
        row.id,
        actor.userId
      );
    }

    return mapTask(row, actor);
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

    let progress = resolveTaskAssigneeProgress(current);
    const evidenceLinks =
      evidence?.links !== undefined
        ? sanitizeEvidenceLinks(evidence.links)
        : undefined;
    const evidenceNotes =
      evidence?.notes !== undefined ? String(evidence.notes).trim() : undefined;

    if (actor.role === "admin") {
      if (
        status === TaskStatus.completed &&
        current.status !== TaskStatus.completed
      ) {
        assertCompletionEvidence(current, evidence, actor.role);
      }
      progress = applyStatusToAllAssignees(progress, status, {
        links: evidenceLinks,
        notes: evidenceNotes,
      });
    } else {
      const mine = findAssigneeProgress(progress, actor.employeeId);
      if (
        status === TaskStatus.completed &&
        mine?.status !== TaskStatus.completed
      ) {
        assertCompletionEvidence(
          {
            ...current,
            evidenceLinks: mine?.evidenceLinks ?? current.evidenceLinks,
            evidenceNotes: mine?.evidenceNotes ?? current.evidenceNotes,
          },
          evidence,
          actor.role
        );
      }
      progress = applyAssigneeStatusChange(
        progress,
        actor.employeeId,
        status,
        { links: evidenceLinks, notes: evidenceNotes }
      );
    }

    const rolledStatus = rollupTaskStatus(progress);
    const rolledCompletedAt = rollupCompletedAtDate(progress);
    const summary = taskAssigneeCompletionSummary(progress);
    const actorProgress = findAssigneeProgress(progress, actor.employeeId);
    const primaryEvidence =
      actorProgress ??
      progress.find((p) => p.status === TaskStatus.completed) ??
      progress[0];

    const prevMine = findAssigneeProgress(
      resolveTaskAssigneeProgress(current),
      actor.employeeId
    );

    const row = await this.prisma.workTask.update({
      where: { id },
      data: {
        status: rolledStatus,
        assigneeProgress: progress as unknown as Prisma.InputJsonValue,
        ...(evidenceLinks !== undefined
          ? { evidenceLinks }
          : primaryEvidence?.evidenceLinks
            ? { evidenceLinks: primaryEvidence.evidenceLinks }
            : {}),
        ...(evidenceNotes !== undefined
          ? { evidenceNotes }
          : primaryEvidence?.evidenceNotes !== undefined
            ? { evidenceNotes: primaryEvidence.evidenceNotes }
            : {}),
        completedAt: rolledCompletedAt,
        updatedBy: actor.userId,
        version: { increment: 1 },
      },
    });

    const justCompletedSelf =
      actor.role === "employee" &&
      status === TaskStatus.completed &&
      prevMine?.status !== TaskStatus.completed &&
      !isPersonal(current.origin);
    const becameFullyComplete =
      rolledStatus === TaskStatus.completed &&
      current.status !== TaskStatus.completed &&
      !isPersonal(current.origin);

    if (justCompletedSelf || becameFullyComplete) {
      const useFullCompleteKeys =
        becameFullyComplete && (!justCompletedSelf || summary.total <= 1);
      await this.notifications.notifyDomain({
        companyId,
        actorId: actor.userId,
        category: "work",
        priority: "normal",
        audience: "admin",
        titleKey: useFullCompleteKeys
          ? "notifications.taskCompletedTitle"
          : "notifications.taskAssigneeCompletedTitle",
        bodyKey: useFullCompleteKeys
          ? "notifications.taskCompletedBody"
          : "notifications.taskAssigneeCompletedBody",
        vars: {
          title: row.title,
          completedCount: String(summary.completedCount),
          pendingCount: String(summary.pendingCount),
          total: String(summary.total),
        },
        href: "/tasks",
        entityType: "work_task",
        entityId: row.id,
      });
      await writeActivity(this.prisma, {
        companyId,
        type: "announcement",
        title: useFullCompleteKeys
          ? "Task completed"
          : "Task assignee completed",
        description: useFullCompleteKeys
          ? row.title
          : `${row.title} (${summary.completedCount}/${summary.total})`,
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

    return mapTask(row, actor);
  }
}
