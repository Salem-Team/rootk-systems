import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from "@nestjs/common";
import { createReadStream } from "fs";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { auditFields } from "../common/mappers";
import { AppRole } from "../common/roles";
import { listDirectReportIds } from "../lib/team";
import { workTaskListScope } from "./work-access";
import type { Actor } from "./work-mappers";
import {
  assertVoicePayload,
  deleteCompanyVoiceFile,
  saveCompanyVoiceFile,
  voiceAbsolutePath,
} from "./work-voice-storage";

function mapComment(row: {
  id: string;
  companyId: string;
  taskId: string;
  parentId: string | null;
  authorUserId: string;
  authorEmployeeId: string | null;
  authorName: string;
  body: string;
  voiceFileId: string | null;
  voiceDurationMs: number | null;
  voiceMime: string | null;
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
    taskId: row.taskId,
    parentId: row.parentId,
    authorUserId: row.authorUserId,
    authorEmployeeId: row.authorEmployeeId,
    authorName: row.authorName,
    body: row.body,
    voiceFileId: row.voiceFileId,
    voiceDurationMs: row.voiceDurationMs,
    voiceMime: row.voiceMime,
    voiceUrl: row.voiceFileId
      ? `/work/tasks/${row.taskId}/voice/${row.voiceFileId}`
      : null,
    ...auditFields(row),
  };
}

@Injectable()
export class WorkTaskCommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService
  ) {}

  private async assertCanViewTask(
    companyId: string,
    actor: Actor,
    taskId: string
  ) {
    const task = await this.prisma.workTask.findFirst({
      where: { id: taskId, companyId, deletedAt: null },
    });
    if (!task) throw new NotFoundException("Task not found");
    if (actor.role === AppRole.admin) return task;
    const scope = workTaskListScope(actor);
    if (scope === "all") return task;
    if (task.assigneeIds.includes(actor.employeeId)) return task;
    if (
      task.createdBy === actor.userId ||
      task.createdBy === actor.employeeId
    ) {
      return task;
    }
    if (scope === "managed") {
      const reports = actor.employeeId
        ? await listDirectReportIds(this.prisma, companyId, actor.employeeId)
        : [];
      if (task.assigneeIds.some((id) => reports.includes(id))) return task;
    }
    throw new ForbiddenException("You cannot view this task");
  }

  async listComments(companyId: string, actor: Actor, taskId: string) {
    await this.assertCanViewTask(companyId, actor, taskId);
    const rows = await this.prisma.workTaskComment.findMany({
      where: { companyId, taskId, deletedAt: null },
      orderBy: { createdAt: "asc" },
      take: 500,
    });
    return rows.map(mapComment);
  }

  async createComment(
    companyId: string,
    actor: Actor,
    taskId: string,
    body: Record<string, unknown>
  ) {
    const task = await this.assertCanViewTask(companyId, actor, taskId);
    const text = String(body.body ?? "").trim();
    const parentId =
      typeof body.parentId === "string" && body.parentId.trim()
        ? body.parentId.trim()
        : null;
    const voiceInput =
      body.voice && typeof body.voice === "object"
        ? (body.voice as {
            dataBase64?: string;
            mime?: string;
            durationMs?: number;
          })
        : null;

    if (!text && !voiceInput) {
      throw new BadRequestException("Add a comment or a voice note");
    }
    if (text.length > 4000) {
      throw new BadRequestException("Comment is too long");
    }

    if (parentId) {
      const parent = await this.prisma.workTaskComment.findFirst({
        where: {
          id: parentId,
          companyId,
          taskId,
          deletedAt: null,
          parentId: null,
        },
      });
      if (!parent) {
        throw new BadRequestException("Parent comment not found");
      }
    }

    let voiceFileId: string | null = null;
    let voiceDurationMs: number | null = null;
    let voiceMime: string | null = null;
    if (voiceInput) {
      const parsed = assertVoicePayload(voiceInput);
      voiceFileId = await saveCompanyVoiceFile(
        companyId,
        parsed.buffer,
        parsed.mime
      );
      voiceDurationMs = parsed.durationMs;
      voiceMime = parsed.mime;
    }

    const author = await this.resolveAuthor(companyId, actor);
    const row = await this.prisma.workTaskComment.create({
      data: {
        companyId,
        taskId,
        parentId,
        authorUserId: actor.userId,
        authorEmployeeId: actor.employeeId || null,
        authorName: author,
        body: text,
        voiceFileId,
        voiceDurationMs,
        voiceMime,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      },
    });

    await this.notifyComment(companyId, actor, task, row.id, text, Boolean(voiceFileId));
    return mapComment(row);
  }

  async deleteComment(
    companyId: string,
    actor: Actor,
    taskId: string,
    commentId: string
  ) {
    await this.assertCanViewTask(companyId, actor, taskId);
    const row = await this.prisma.workTaskComment.findFirst({
      where: { id: commentId, companyId, taskId, deletedAt: null },
    });
    if (!row) throw new NotFoundException("Comment not found");
    const canDelete =
      actor.role === AppRole.admin || row.authorUserId === actor.userId;
    if (!canDelete) {
      throw new ForbiddenException("You can only delete your own comments");
    }
    await this.prisma.workTaskComment.update({
      where: { id: commentId },
      data: {
        deletedAt: new Date(),
        updatedBy: actor.userId,
        version: { increment: 1 },
      },
    });
    if (row.voiceFileId) {
      await deleteCompanyVoiceFile(companyId, row.voiceFileId);
    }
    return { id: commentId, deleted: true };
  }

  async streamVoice(
    companyId: string,
    actor: Actor,
    taskId: string,
    fileId: string
  ): Promise<{ file: StreamableFile; mime: string }> {
    await this.assertCanViewTask(companyId, actor, taskId);
    const row = await this.prisma.workTaskComment.findFirst({
      where: {
        companyId,
        taskId,
        voiceFileId: fileId,
        deletedAt: null,
      },
      select: { voiceMime: true },
    });
    if (!row) throw new NotFoundException("Voice note not found");
    const abs = voiceAbsolutePath(companyId, fileId);
    const stream = createReadStream(abs);
    return {
      file: new StreamableFile(stream),
      mime: row.voiceMime || "audio/webm",
    };
  }

  private async resolveAuthor(companyId: string, actor: Actor): Promise<string> {
    if (actor.employeeId) {
      const emp = await this.prisma.employee.findFirst({
        where: { id: actor.employeeId, companyId, deletedAt: null },
        select: { name: true },
      });
      if (emp?.name) return emp.name;
    }
    const user = await this.prisma.user.findFirst({
      where: { id: actor.userId, companyId, deletedAt: null },
      select: { displayName: true, firstName: true, lastName: true, email: true },
    });
    const composed = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
    return user?.displayName || composed || user?.email || "User";
  }

  private async notifyComment(
    companyId: string,
    actor: Actor,
    task: { id: string; title: string; assigneeIds: string[]; createdBy: string | null },
    commentId: string,
    text: string,
    hasVoice: boolean
  ) {
    const employeeIds = new Set(task.assigneeIds);
    if (task.createdBy) {
      const creator = await this.prisma.user.findFirst({
        where: { id: task.createdBy, companyId, deletedAt: null },
        select: { employeeId: true, id: true },
      });
      if (creator?.employeeId) employeeIds.add(creator.employeeId);
    }
    employeeIds.delete(actor.employeeId);
    if (employeeIds.size === 0) return;

    const users = await this.prisma.user.findMany({
      where: {
        companyId,
        employeeId: { in: [...employeeIds] },
        deletedAt: null,
        isActive: true,
      },
      select: { id: true },
    });
    const recipientIds = users
      .map((u) => u.id)
      .filter((id) => id !== actor.userId);
    if (recipientIds.length === 0) return;

    const preview = text
      ? text.slice(0, 80)
      : hasVoice
        ? "Voice note"
        : "";

    await this.notifications.notifyDomain({
      companyId,
      actorId: actor.userId,
      category: "work",
      priority: "normal",
      audience: "employee",
      titleKey: "notifications.taskCommentTitle",
      bodyKey: "notifications.taskCommentBody",
      vars: {
        title: task.title,
        preview,
      },
      href: `/tasks?task=${task.id}&comment=${commentId}`,
      entityType: "task",
      entityId: task.id,
      recipientIds,
    });
  }
}
