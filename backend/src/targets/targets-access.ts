/** Actor identity + capability checks shared across all Targets domain services. */
import { ForbiddenException } from "@nestjs/common";
import { TargetPriority, TaskPriority } from "@prisma/client";
import type { AppRoleName } from "../common/roles";
import { canTarget } from "../lib/target-policies";

export type Actor = {
  userId: string;
  role: AppRoleName;
  employeeId: string;
};

export function assertCap(actor: Actor, capability: Parameters<typeof canTarget>[1]) {
  if (!canTarget(actor.role, capability)) {
    throw new ForbiddenException("Insufficient target permissions");
  }
}

export function mapTaskPriority(p: TargetPriority): TaskPriority {
  if (p === "critical" || p === "high") return TaskPriority.high;
  if (p === "low") return TaskPriority.low;
  return TaskPriority.medium;
}
