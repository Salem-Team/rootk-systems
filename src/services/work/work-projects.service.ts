import { AppRole } from "@/constants/roles";
import { hasPermissionId } from "@/constants/permissions";
import {
  deleteWorkProjectPdf,
  deleteWorkProjectRemote,
  fetchWorkProjects,
  patchWorkProject,
  postWorkProject,
  postWorkProjectPdf,
  type WorkProjectPdfView,
} from "@/api/work-projects.api";
import { enrichWithAudit, touchEntity } from "@/lib/entity";
import { createId } from "@/lib/id";
import { API_ROUTES } from "@/api/routes";
import { isApiMode } from "@/lib/env";
import { getHttpClient } from "@/lib/http-client";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { emitWorkUpdated } from "@/lib/events";
import { emptyWorkProject, projectIncludesEmployee } from "@/lib/work-project";
import { workProjectRepository } from "@/repositories/work.repository";
import {
  workProjectBodySchema,
  type WorkProjectBody,
} from "@/schemas/work-project.schema";
import { fail, fromError, ok } from "@/services/api-result";
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
  return rows.filter((project) => projectIncludesEmployee(project, employeeId));
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
        technicalDetails: data.technicalDetails,
        fullDescription: data.fullDescription,
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
      technicalDetails: data.technicalDetails,
      fullDescription: data.fullDescription,
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

const localProjectPdfs = new Map<
  string,
  { fileName: string; uploadedAt: string; dataBase64: string }
>();

function readFileBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result ?? "");
      const comma = value.indexOf(",");
      resolve(comma >= 0 ? value.slice(comma + 1) : value);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function uploadWorkProjectPdf(
  id: string,
  file: File
): Promise<ApiResponse<WorkProjectPdfView | null>> {
  if (file.size > 10 * 1024 * 1024) {
    return fail(null, "PDF must be under 10MB", "VALIDATION_ERROR");
  }
  try {
    const dataBase64 = await readFileBase64(file);
    if (!dataBase64) return fail(null, "PDF file is required", "VALIDATION_ERROR");
    if (isApiMode()) {
      const res = await postWorkProjectPdf(id, {
        fileName: file.name,
        mimeType: file.type || "application/pdf",
        dataBase64,
      });
      if (res.success) emitWorkUpdated();
      return res;
    }
    const view = {
      fileName: file.name || "project.pdf",
      uploadedAt: new Date().toISOString(),
    };
    localProjectPdfs.set(id, { ...view, dataBase64 });
    const current = await workProjectRepository.findById(id);
    if (current) {
      await workProjectRepository.update(id, { ...current, projectPdf: view });
    }
    emitWorkUpdated();
    return ok(view);
  } catch (error) {
    return fromError(error, null);
  }
}

export async function removeWorkProjectPdf(
  id: string
): Promise<ApiResponse<null>> {
  if (isApiMode()) {
    const res = await deleteWorkProjectPdf(id);
    if (res.success) emitWorkUpdated();
    return res;
  }
  localProjectPdfs.delete(id);
  const current = await workProjectRepository.findById(id);
  if (current) {
    await workProjectRepository.update(id, { ...current, projectPdf: null });
  }
  emitWorkUpdated();
  return ok(null);
}

export async function openWorkProjectPdf(id: string): Promise<Blob> {
  if (isApiMode()) {
    return getHttpClient().requestBlob(API_ROUTES.work.projectPdf(id));
  }
  const stored = localProjectPdfs.get(id);
  if (!stored) throw new NotFoundError("Project PDF was not found");
  const bytes = Uint8Array.from(atob(stored.dataBase64), (char) => char.charCodeAt(0));
  return new Blob([bytes], { type: "application/pdf" });
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
