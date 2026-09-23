import { AppRole } from "@/constants/roles";
import { hasPermissionId } from "@/constants/permissions";
import {
  deleteWorkProjectRemote,
  fetchWorkProjects,
  patchWorkProject,
  postWorkProject,
} from "@/api/work-projects.api";
import { enrichWithAudit, touchEntity } from "@/lib/entity";
import { createId } from "@/lib/id";
import { isApiMode } from "@/lib/env";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { emitWorkUpdated } from "@/lib/events";
import { emptyWorkProject } from "@/lib/work-project";
import { workProjectRepository } from "@/repositories/work.repository";
import {
  workProjectBodySchema,
  type WorkProjectBody,
} from "@/schemas/work-project.schema";
import { fromError, ok } from "@/services/api-result";
import { actorContext } from "@/services/work/work-shared";
import {
  getSessionPermissions,
  getSessionRole,
} from "@/stores/session-store";
import type { ApiResponse } from "@/types";
import type { WorkProject } from "@/types/work-project";

function canSeeAllProjects(): boolean {
  const role = getSessionRole();
  const permissions = getSessionPermissions();
  return (
    role === AppRole.admin ||
    hasPermissionId("tasks.viewAll", permissions, role) ||
    hasPermissionId("tasks.assign", permissions, role)
  );
}

function canManageProjects(): boolean {
  const role = getSessionRole();
  if (role !== AppRole.employee) return true;
  const permissions = getSessionPermissions();
  return (
    hasPermissionId("tasks.assign", permissions, role) ||
    hasPermissionId("tasks.editOthers", permissions, role)
  );
}

function visibleToActor(rows: WorkProject[], employeeId: string): WorkProject[] {
  if (canSeeAllProjects()) return rows;
  return rows.filter(
    (project) =>
      project.leadId === employeeId || project.memberIds.includes(employeeId)
  );
}

export async function getWorkProjects(): Promise<ApiResponse<WorkProject[]>> {
  const { employeeId } = actorContext();
  if (isApiMode()) return fetchWorkProjects();
  try {
    const rows = await workProjectRepository.listRecent();
    return ok(visibleToActor(rows, employeeId));
  } catch (error) {
    return fromError(error, []);
  }
}

export async function createWorkProject(
  input: WorkProjectBody
): Promise<ApiResponse<WorkProject>> {
  const { userId } = actorContext();
  if (isApiMode()) {
    const res = await postWorkProject(input);
    if (res.success) emitWorkUpdated();
    return res;
  }
  try {
    if (!canManageProjects()) {
      throw new ForbiddenError("Only managers can edit projects");
    }
    const parsed = workProjectBodySchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("Invalid project payload", parsed.error.flatten());
    }
    const data = parsed.data;
    const project = enrichWithAudit(
      {
        id: createId("prj"),
        name: data.name,
        description: data.description,
        status: data.status,
        startDate: data.startDate,
        endDate: data.endDate,
        leadId: data.leadId,
        memberIds: data.memberIds,
        phases: data.phases,
      } satisfies Omit<WorkProject, keyof import("@/types").BaseEntity>,
      userId
    );
    await workProjectRepository.create(project);
    emitWorkUpdated();
    return ok(project, "Project created");
  } catch (error) {
    return fromError(error, emptyWorkProject());
  }
}

export async function updateWorkProject(
  id: string,
  input: WorkProjectBody
): Promise<ApiResponse<WorkProject>> {
  const { userId } = actorContext();
  if (isApiMode()) {
    const res = await patchWorkProject(id, input);
    if (res.success) emitWorkUpdated();
    return res;
  }
  try {
    if (!canManageProjects()) {
      throw new ForbiddenError("Only managers can edit projects");
    }
    const current = await workProjectRepository.findById(id);
    if (!current) throw new NotFoundError("Project not found");
    const parsed = workProjectBodySchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("Invalid project payload", parsed.error.flatten());
    }
    const data = parsed.data;
    const next = touchEntity(current, userId, {
      name: data.name,
      description: data.description,
      status: data.status,
      startDate: data.startDate,
      endDate: data.endDate,
      leadId: data.leadId,
      memberIds: data.memberIds,
      phases: data.phases,
    });
    const saved = await workProjectRepository.update(id, next);
    if (!saved) throw new NotFoundError("Project not found");
    emitWorkUpdated();
    return ok(saved, "Project updated");
  } catch (error) {
    return fromError(error, emptyWorkProject(id));
  }
}

export async function deleteWorkProject(
  id: string
): Promise<ApiResponse<boolean>> {
  if (isApiMode()) {
    const res = await deleteWorkProjectRemote(id);
    if (res.success) emitWorkUpdated();
    return res;
  }
  try {
    if (!canManageProjects()) {
      throw new ForbiddenError("Only managers can edit projects");
    }
    const current = await workProjectRepository.findById(id);
    if (!current) throw new NotFoundError("Project not found");
    const deleted = await workProjectRepository.delete(id);
    if (!deleted) throw new NotFoundError("Project not found");
    emitWorkUpdated();
    return ok(true, "Project deleted");
  } catch (error) {
    return fromError(error, false);
  }
}
