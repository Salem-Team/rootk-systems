import { api } from "@/api/http";
import { API_ROUTES } from "@/api/routes";
import type {
  CreateWorkTaskCommentInput,
  WorkTaskComment,
} from "@/types/work";
import type { ApiResponse } from "@/types";

const emptyComment = (): WorkTaskComment => ({
  id: "",
  companyId: "",
  taskId: "",
  parentId: null,
  authorUserId: "",
  authorEmployeeId: null,
  authorName: "",
  body: "",
  voiceFileId: null,
  voiceDurationMs: null,
  voiceMime: null,
  voiceUrl: null,
  createdAt: "",
  updatedAt: "",
  createdBy: "",
  updatedBy: "",
  deletedAt: null,
  isArchived: false,
  version: 0,
  metadata: {},
});

export function fetchTaskComments(
  taskId: string
): Promise<ApiResponse<WorkTaskComment[]>> {
  return api.get(API_ROUTES.work.taskComments(taskId), []);
}

export function postTaskComment(
  taskId: string,
  input: CreateWorkTaskCommentInput
): Promise<ApiResponse<WorkTaskComment>> {
  return api.post(API_ROUTES.work.taskComments(taskId), input, emptyComment());
}

export function deleteTaskCommentApi(
  taskId: string,
  commentId: string
): Promise<ApiResponse<{ id: string; deleted: boolean }>> {
  return api.delete(API_ROUTES.work.taskCommentById(taskId, commentId), {
    id: commentId,
    deleted: false,
  });
}
