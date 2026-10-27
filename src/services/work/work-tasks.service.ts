import { isApiMode } from "@/lib/env";
import { fetchWorkTaskById, fetchWorkTasks } from "@/api/work.api";
import {
  workProjectRepository,
  workTaskRepository,
} from "@/repositories/work.repository";
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

/** Local-mode mirror of backend visibility: assignee, creator, reports, project lead. */
async function filterVisibleWorkTasks(
  tasks: WorkTask[],
  selfId: string,
  userId: string,
  includeReports: boolean
): Promise<WorkTask[]> {
  const reportIds = new Set<string>([selfId].filter(Boolean));
  if (includeReports && selfId) {
    const { listLocalDirectReportIds } = await import("@/services/team-access");
    for (const id of await listLocalDirectReportIds(selfId)) {
      reportIds.add(id);
    }
  }

  const projects = await workProjectRepository.list();
  const ledProjectIds = new Set(
    projects
      .filter((project) => !project.deletedAt && project.leadId === selfId)
      .map((project) => project.id)
  );

  return tasks.filter((task) => {
    if (task.assigneeIds.some((id) => reportIds.has(id))) return true;
    if (task.createdBy === userId || task.createdBy === selfId) return true;
    if (task.projectId && ledProjectIds.has(task.projectId)) return true;
    return false;
  });
}

/** GET /work/tasks */
export async function getWorkTasks(filters: {
  employeeId?: string;
  status?: TaskStatus;
  team?: boolean;
} = {}): Promise<ApiResponse<WorkTask[]>> {
  const { role, userId, employeeId: selfId } = actorContext();
  const scope = workTaskListScope();
  const companyWide = scope === "all" || role === AppRole.admin;

  if (isApiMode()) {
    const res = await fetchWorkTasks({
      employeeId: filters.employeeId,
      status: filters.status,
      // Server applies assignee / team-lead / project-lead visibility from permissions.
      team: !companyWide || filters.team ? true : undefined,
    });
    if (!res.success) return res;
    return ok(
      companyWide
        ? (res.data ?? [])
        : presentWorkTasksForActor(res.data ?? [])
    );
  }

  try {
    let tasks = await workTaskRepository.filter({
      employeeId: companyWide ? filters.employeeId : undefined,
      status: filters.status,
    });

    if (!companyWide) {
      tasks = await filterVisibleWorkTasks(
        tasks,
        selfId,
        userId,
        scope === "managed"
      );
      if (filters.employeeId) {
        tasks = tasks.filter((task) =>
          isAssignedTo(task.assigneeIds, filters.employeeId!)
        );
      }
    }

    return ok(
      companyWide ? tasks : presentWorkTasksForActor(tasks)
    );
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
    const { role, userId, employeeId } = actorContext();
    const scope = workTaskListScope();
    if (role === AppRole.employee && scope !== "all") {
      const visible = await filterVisibleWorkTasks(
        [task],
        employeeId,
        userId,
        scope === "managed"
      );
      if (visible.length === 0) {
        return fail(null, "Task not found", "NOT_FOUND");
      }
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
