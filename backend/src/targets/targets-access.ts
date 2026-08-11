/** Actor identity + capability checks shared across all Targets domain services. */
import { ForbiddenException } from "@nestjs/common";
import { TargetPriority, TaskPriority } from "@prisma/client";
import type { AppRoleName } from "../common/roles";
import { canViewOthersInModule } from "../common/permissions-catalog";
import { canTarget } from "../lib/target-policies";

export type Actor = {
  userId: string;
  role: AppRoleName;
  employeeId: string;
  permissions?: string[];
};

export function assertCap(actor: Actor, capability: Parameters<typeof canTarget>[1]) {
  if (!canTarget(actor.role, capability, actor.permissions)) {
    throw new ForbiddenException("Insufficient target permissions");
  }
}

export function canSeeTargetOthers(actor: Actor) {
  return canViewOthersInModule(
    actor.permissions,
    "targets.viewAll",
    "targets.viewTeam"
  );
}

export function mapTaskPriority(p: TargetPriority): TaskPriority {
  if (p === "critical" || p === "high") return TaskPriority.high;
  if (p === "low") return TaskPriority.low;
  return TaskPriority.medium;
}
