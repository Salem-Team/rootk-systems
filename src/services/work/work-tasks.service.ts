import { isApiMode } from "@/lib/env";
import { fetchWorkTaskById, fetchWorkTasks } from "@/api/work.api";
import { workTaskRepository } from "@/repositories/work.repository";
import { fail, fromError, ok } from "@/services/api-result";
import { getWorkEmployeeId } from "@/stores/session-store";
import { isAssignedTo } from "@/lib/work-utils";
import { AppRole } from "@/constants/roles";
import {
  actorContext,
  presentWorkTaskForActor,
  presentWorkTasksForActor,
} from "@/services/work/work-shared";
import type { ApiResponse } from "@/types";
import type { TaskStatus, WorkTask } from "@/types/work";

/** GET /work/tasks */
export async function getWorkTasks(filters: {
  employeeId?: string;
  status?: TaskStatus;
  team?: boolean;
} = {}): Promise<ApiResponse<WorkTask[]>> {
  const { role, employeeId: selfId } = actorContext();
  const teamView = Boolean(filters.team) && role === AppRole.employee;
  const scoped = teamView
    ? { ...filters, employeeId: undefined, team: true }
    : role === AppRole.employee
      ? { ...filters, employeeId: selfId, team: undefined }
      : filters;
  if (isApiMode()) {
    const res = await fetchWorkTasks(scoped);
    if (!res.success) return res;
    return ok(presentWorkTasksForActor(res.data ?? []));
  }
  try {
    let tasks = await workTaskRepository.filter({
      employeeId: teamView ? undefined : scoped.employeeId,
      status: scoped.status,
    });
    if (teamView) {
      const { listLocalDirectReportIds } = await import(
        "@/services/team-access"
      );
      const reportIds = new Set(await listLocalDirectReportIds(selfId));
      tasks = tasks.filter((task) =>
        task.assigneeIds.some((id) => reportIds.has(id))
      );
    }
    return ok(presentWorkTasksForActor(tasks));
  } catch (error) {
    return fromError(error, []);
  }
}

/** GET /work/tasks/:id */
export async function getWorkTaskById(
  id: string
): Promise<ApiResponse<WorkTask | null>> {
  if (isApiMode()) {
    const res = await fetchWorkTaskById(id);
    if (!res.success || !res.data) return res;
    return ok(presentWorkTaskForActor(res.data));
  }
  try {
    const task = await workTaskRepository.findById(id);
    if (!task) return fail(null, "Task not found", "NOT_FOUND");
    const { role, employeeId } = actorContext();
    if (
      role === AppRole.employee &&
      !isAssignedTo(task.assigneeIds, employeeId)
    ) {
      return fail(null, "Task not found", "NOT_FOUND");
    }
    return ok(presentWorkTaskForActor(task));
  } catch (error) {
    return fromError(error, null);
  }
}

/** GET /work/tasks?mine=1 */
export async function getMyWorkTasks(
  employeeId = getWorkEmployeeId()
): Promise<ApiResponse<WorkTask[]>> {
  return getWorkTasks({ employeeId });
}
