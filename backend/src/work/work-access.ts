import { ForbiddenException } from "@nestjs/common";
import type { WorkTask } from "@prisma/client";
import { AppRole } from "../common/roles";
import { hasPermissionId } from "../common/permissions-catalog";
import { listDirectReportIds } from "../lib/team";
import type { PrismaService } from "../prisma/prisma.service";
import { ownsPersonalTask, type Actor } from "./work-mappers";

export type WorkTaskListScope = "all" | "managed" | "own";

/** Who the actor may list besides tasks assigned to them. */
export function workTaskListScope(actor: Actor): WorkTaskListScope {
  if (actor.role === AppRole.admin) return "all";
  const permissions = actor.permissions;
  const role = actor.role;
  if (hasPermissionId("tasks.viewAll", permissions, role)) return "all";
  if (hasPermissionId("team.viewAll", permissions, role)) return "all";
  if (
    hasPermissionId("tasks.viewTeam", permissions, role) ||
    hasPermissionId("tasks.assign", permissions, role)
  ) {
    return "managed";
  }
  return "own";
}

export async function assertCanMutateWorkTask(
  prisma: PrismaService,
  companyId: string,
  actor: Actor,
  task: WorkTask,
  kind: "edit" | "delete"
) {
  const allPerm = kind === "edit" ? "tasks.editOthers" : "tasks.deleteOthers";
  const teamPerm = kind === "edit" ? "tasks.editTeam" : "tasks.deleteTeam";
  const ownPerm = kind === "edit" ? "tasks.editOwn" : "tasks.deleteOwn";
  if (
    actor.role === AppRole.admin ||
    hasPermissionId(allPerm, actor.permissions, actor.role)
  ) {
    return;
  }
  if (
    hasPermissionId(ownPerm, actor.permissions, actor.role) &&
    ownsPersonalTask(task, actor)
  ) {
    return;
  }
  if (hasPermissionId(teamPerm, actor.permissions, actor.role)) {
    const reports = actor.employeeId
      ? await listDirectReportIds(prisma, companyId, actor.employeeId)
      : [];
    if (task.assigneeIds.some((id) => reports.includes(id))) return;
  }
  throw new ForbiddenException(
    kind === "edit"
      ? "You can only edit tasks in your team scope"
      : "You can only delete tasks in your team scope"
  );
}

export function canWidenTaskAssignees(actor: Actor): boolean {
  return (
    actor.role === AppRole.admin ||
    hasPermissionId("tasks.editOthers", actor.permissions, actor.role) ||
    hasPermissionId("tasks.editTeam", actor.permissions, actor.role)
  );
}
