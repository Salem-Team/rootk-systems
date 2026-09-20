import { isApiMode } from "@/lib/env";
import { emitWorkUpdated } from "@/lib/events";
import {
  VOICE_MAX_BYTES,
  VOICE_MAX_DURATION_MS,
  VOICE_MIN_DURATION_MS,
} from "@/lib/voice/voice-note";
import {
  fetchTaskComments,
  postTaskComment,
  deleteTaskCommentApi,
} from "@/api/work-task-comments.api";
import { workTaskCommentRepository } from "@/repositories/work-task-comments.repository";
import { workTaskRepository } from "@/repositories/work.repository";
import { fail, ok } from "@/services/api-result";
import { useSessionStore } from "@/stores/session-store";
import type {
  CreateWorkTaskCommentInput,
  WorkTaskComment,
} from "@/types/work";
import type { ApiResponse } from "@/types";

function newId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

function validateVoice(voice: CreateWorkTaskCommentInput["voice"]) {
  if (!voice) return null;
  const durationMs = Math.round(Number(voice.durationMs ?? 0));
  if (
    !Number.isFinite(durationMs) ||
    durationMs < VOICE_MIN_DURATION_MS ||
    durationMs > VOICE_MAX_DURATION_MS
  ) {
    return "Invalid voice duration";
  }
  const raw = String(voice.dataBase64 ?? "").replace(/^data:[^;]+;base64,/, "");
  if (!raw) return "Voice data required";
  const bytes = Math.floor((raw.length * 3) / 4);
  if (bytes > VOICE_MAX_BYTES) return "Voice file too large";
  return null;
}

export async function listTaskComments(
  taskId: string
): Promise<ApiResponse<WorkTaskComment[]>> {
  if (isApiMode()) {
    try {
      return await fetchTaskComments(taskId);
    } catch (err) {
      return fail(
        [],
        err instanceof Error ? err.message : "Failed to load comments"
      );
    }
  }
  try {
    const items = await workTaskCommentRepository.listForTask(taskId);
    return ok(items);
  } catch (err) {
    return fail(
      [],
      err instanceof Error ? err.message : "Failed to load comments"
    );
  }
}

export async function createTaskComment(
  taskId: string,
  input: CreateWorkTaskCommentInput
): Promise<ApiResponse<WorkTaskComment | null>> {
  const body = String(input.body ?? "").trim();
  const voiceError = validateVoice(input.voice ?? null);
  if (voiceError) return fail(null, voiceError);
  if (!body && !input.voice) return fail(null, "Add a comment or a voice note");
  if (body.length > 4000) return fail(null, "Comment is too long");

  if (isApiMode()) {
    try {
      const res = await postTaskComment(taskId, {
        body: body || undefined,
        parentId: input.parentId ?? null,
        voice: input.voice ?? null,
      });
      if (res.success) emitWorkUpdated();
      return res;
    } catch (err) {
      return fail(
        null,
        err instanceof Error ? err.message : "Failed to post comment"
      );
    }
  }

  try {
    const task = await workTaskRepository.findById(taskId);
    if (!task) return fail(null, "Task not found");
    const session = useSessionStore.getState();
    const now = new Date().toISOString();
    const voice = input.voice;
    const dataUrl = voice
      ? `data:${voice.mime};base64,${String(voice.dataBase64).replace(/^data:[^;]+;base64,/, "")}`
      : null;
    const comment: WorkTaskComment = {
      id: newId("tcmt"),
      taskId,
      parentId: input.parentId ?? null,
      authorUserId: session.user.id,
      authorEmployeeId: session.user.employeeId ?? null,
      authorName: session.user.displayName || session.user.email || "You",
      body,
      voiceFileId: voice ? newId("voice") : null,
      voiceDurationMs: voice?.durationMs ?? null,
      voiceMime: voice?.mime ?? null,
      voiceUrl: dataUrl,
      companyId: task.companyId || "local",
      createdAt: now,
      updatedAt: now,
      createdBy: session.user.id,
      updatedBy: session.user.id,
      deletedAt: null,
      isArchived: false,
      version: 1,
      metadata: {},
    };
    if (comment.parentId) {
      const parent = await workTaskCommentRepository.findById(comment.parentId);
      if (!parent || parent.taskId !== taskId || parent.parentId) {
        return fail(null, "Parent comment not found");
      }
    }
    await workTaskCommentRepository.create(comment);
    emitWorkUpdated();
    return ok(comment);
  } catch (err) {
    return fail(
      null,
      err instanceof Error ? err.message : "Failed to post comment"
    );
  }
}

export async function deleteTaskComment(
  taskId: string,
  commentId: string
): Promise<ApiResponse<{ id: string; deleted: boolean } | null>> {
  if (isApiMode()) {
    try {
      const res = await deleteTaskCommentApi(taskId, commentId);
      if (res.success) emitWorkUpdated();
      return res;
    } catch (err) {
      return fail(
        null,
        err instanceof Error ? err.message : "Failed to delete"
      );
    }
  }
  try {
    const current = await workTaskCommentRepository.findById(commentId);
    if (!current || current.taskId !== taskId) {
      return fail(null, "Comment not found");
    }
    const session = useSessionStore.getState();
    if (
      session.role !== "admin" &&
      current.authorUserId !== session.user.id
    ) {
      return fail(null, "You can only delete your own comments");
    }
    await workTaskCommentRepository.update(commentId, {
      ...current,
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    emitWorkUpdated();
    return ok({ id: commentId, deleted: true });
  } catch (err) {
    return fail(null, err instanceof Error ? err.message : "Failed to delete");
  }
}
