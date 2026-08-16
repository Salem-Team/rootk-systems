import { AppRole } from "../common/roles";
import { hasPermissionId } from "../common/permissions-catalog";
import type { Actor } from "./work-mappers";

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
    hasPermissionId("tasks.assign", permissions, role) ||
    hasPermissionId("tasks.editOthers", permissions, role)
  ) {
    return "managed";
  }
  return "own";
}
