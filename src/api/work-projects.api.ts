import { api } from "@/api/http";
import { API_ROUTES } from "@/api/routes";
import { emptyWorkProject } from "@/lib/work-project";
import type { ApiResponse } from "@/types";
import type { WorkProject } from "@/types/work-project";
import type { WorkProjectBody } from "@/schemas/work-project.schema";

export function fetchWorkProjects(): Promise<ApiResponse<WorkProject[]>> {
  return api.getList(API_ROUTES.work.projects);
}

export function postWorkProject(
  input: WorkProjectBody
): Promise<ApiResponse<WorkProject>> {
  return api.post(API_ROUTES.work.projects, input, emptyWorkProject());
}

export function patchWorkProject(
  id: string,
  input: WorkProjectBody
): Promise<ApiResponse<WorkProject>> {
  return api.patch(API_ROUTES.work.projectById(id), input, emptyWorkProject(id));
}

export function deleteWorkProjectRemote(
  id: string
): Promise<ApiResponse<boolean>> {
  return api.delete(API_ROUTES.work.projectById(id), false);
}
