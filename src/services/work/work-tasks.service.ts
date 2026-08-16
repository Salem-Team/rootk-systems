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
  workTaskListScope,
} from "@/services/work/work-shared";
import type { ApiResponse } from "@/types";
import type { TaskStatus, WorkTask } from "@/types/work";

async function filterManagedWorkTasks(
  tasks: WorkTask[],
  selfId: string,
  userId: string
): Promise<WorkTask[]> {
  const { listLocalDirectReportIds } = await import("@/services/team-access");
  const reportIds = new Set(await listLocalDirectReportIds(selfId));
  reportIds.add(selfId);
  return tasks.filter(
    (task) =>
      task.createdBy === userId ||
      task.createdBy === selfId ||
      task.assigneeIds.some((id) => reportIds.has(id))
  );
}

/** GET /work/tasks */
export async function getWorkTasks(filters: {
  employeeId?: string;
  status?: TaskStatus;
  team?: boolean;
} = {}): Promise<ApiResponse<WorkTask[]>> {
  const { role, userId, employeeId: selfId } = actorContext();
  const scope = workTaskListScope();
  const teamView = Boolean(filters.team) && role === AppRole.employee;
  const managedView =
    !teamView &&
    scope === "managed" &&
    !filters.employeeId &&
    role === AppRole.employee;
  const scoped = teamView
    ? { ...filters, employeeId: undefined, team: true }
    : scope === "own" && role === AppRole.employee
      ? { ...filters, employeeId: selfId, team: undefined }
      : { ...filters, team: undefined };
  if (isApiMode()) {
    const res = await fetchWorkTasks(scoped);
    if (!res.success) return res;
    return ok(presentWorkTasksForActor(res.data ?? []));
  }
  try {
    let tasks = await workTaskRepository.filter({
      employeeId: teamView || managedView ? undefined : scoped.employeeId,
      status: scoped.status,
    });
    if (teamView || managedView) {
      tasks = await filterManagedWorkTasks(tasks, selfId, userId);
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
      workTaskListScope() === "own" &&
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
