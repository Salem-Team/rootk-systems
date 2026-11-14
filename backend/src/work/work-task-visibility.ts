import type { Prisma } from "@prisma/client";
import { listDirectReportIds } from "../lib/team";
import type { PrismaService } from "../prisma/prisma.service";
import type { Actor } from "./work-mappers";
import { workTaskListScope, type WorkTaskListScope } from "./work-access";

/** Projects the employee leads or belongs to as a member. */
export async function projectIdsForEmployee(
  prisma: PrismaService,
  companyId: string,
  employeeId: string
): Promise<string[]> {
  if (!employeeId) return [];
  const rows = await prisma.workProject.findMany({
    where: {
      companyId,
      deletedAt: null,
      OR: [{ leadId: employeeId }, { memberIds: { has: employeeId } }],
    },
    select: { id: true },
  });
  return rows.map((row) => row.id);
}

/** True when the employee leads or is a member of the project. */
export async function actorIsProjectParticipant(
  prisma: PrismaService,
  companyId: string,
  employeeId: string,
  projectId: string | null | undefined
): Promise<boolean> {
  if (!employeeId || !projectId) return false;
  const project = await prisma.workProject.findFirst({
    where: {
      id: projectId,
      companyId,
      deletedAt: null,
      OR: [{ leadId: employeeId }, { memberIds: { has: employeeId } }],
    },
    select: { id: true },
  });
  return Boolean(project);
}

/**
 * Build OR clauses for tasks the actor may see:
 * - assigned to them
 * - created by them
 * - assigned to a direct report (team lead / manager)
 * - inside a project they lead or belong to
 *
 * Returns `null` when the actor may list the whole company (`tasks.viewAll` / admin).
 */
export async function workTaskVisibilityOr(
  prisma: PrismaService,
  companyId: string,
  actor: Actor,
  scope: WorkTaskListScope = workTaskListScope(actor)
): Promise<Prisma.WorkTaskWhereInput[] | null> {
  if (scope === "all") return null;

  const selfId = actor.employeeId?.trim() || "";
  const clauses: Prisma.WorkTaskWhereInput[] = [];

  if (selfId) {
    clauses.push({ assigneeIds: { has: selfId } });
  }

  const createdByIds = [actor.userId, selfId].filter(
    (id, index, arr) => Boolean(id) && arr.indexOf(id) === index
  );
  for (const id of createdByIds) {
    clauses.push({ createdBy: id });
  }

  if (scope === "managed" && selfId) {
    const reports = await listDirectReportIds(prisma, companyId, selfId);
    if (reports.length > 0) {
      clauses.push({ assigneeIds: { hasSome: reports } });
    }
  }

  if (selfId) {
    const projectIds = await projectIdsForEmployee(prisma, companyId, selfId);
    if (projectIds.length > 0) {
      clauses.push({ projectId: { in: projectIds } });
    }
  }

  return clauses;
}

/** True when the task row is in the actor’s visibility set. */
export async function actorCanSeeWorkTask(
  prisma: PrismaService,
  companyId: string,
  actor: Actor,
  task: {
    assigneeIds: string[];
    createdBy: string | null;
    projectId: string | null;
  }
): Promise<boolean> {
  const scope = workTaskListScope(actor);
  if (scope === "all") return true;

  const selfId = actor.employeeId?.trim() || "";
  if (selfId && task.assigneeIds.includes(selfId)) return true;

  const createdByIds = new Set(
    [actor.userId, selfId].filter(Boolean)
  );
  if (task.createdBy && createdByIds.has(task.createdBy)) return true;

  if (scope === "managed" && selfId) {
    const reports = await listDirectReportIds(prisma, companyId, selfId);
    if (task.assigneeIds.some((id) => reports.includes(id))) return true;
  }

  if (selfId && task.projectId) {
    return actorIsProjectParticipant(
      prisma,
      companyId,
      selfId,
      task.projectId
    );
  }

  return false;
}
