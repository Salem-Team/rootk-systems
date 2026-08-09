import { isApiMode } from "@/lib/env";
import { fetchWorkTaskById, fetchWorkTasks } from "@/api/work.api";
import { workTaskRepository } from "@/repositories/work.repository";
import { fail, fromError, ok } from "@/services/api-result";
import { getWorkEmployeeId } from "@/stores/session-store";
import { isAssignedTo } from "@/lib/work-utils";
import { AppRole } from "@/constants/roles";
import { actorContext } from "@/services/work/work-shared";
import type { ApiResponse } from "@/types";
import type { TaskStatus, WorkTask } from "@/types/work";

/** GET /work/tasks */
export async function getWorkTasks(filters: {
  employeeId?: string;
  status?: TaskStatus;
} = {}): Promise<ApiResponse<WorkTask[]>> {
  const { role, employeeId: selfId } = actorContext();
  const scoped =
    role === AppRole.employee
      ? { ...filters, employeeId: selfId }
      : filters;
  if (isApiMode()) return fetchWorkTasks(scoped);
  try {
    return ok(await workTaskRepository.filter(scoped));
  } catch (error) {
    return fromError(error, []);
  }
}

/** GET /work/tasks/:id */
export async function getWorkTaskById(
  id: string
): Promise<ApiResponse<WorkTask | null>> {
  if (isApiMode()) return fetchWorkTaskById(id);
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
    return ok(task);
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
