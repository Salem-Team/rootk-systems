/** Actor identity + capability checks shared across all CRM domain services. */
import { ForbiddenException } from "@nestjs/common";
import type { AppRoleName } from "../common/roles";
import { AppRole } from "../common/roles";
import { canCrm, type CrmCapability } from "../lib/crm-policies";

export type Actor = {
  userId: string;
  role: AppRoleName;
  employeeId: string;
};

export function assertCap(actor: Actor, capability: CrmCapability) {
  if (!canCrm(actor.role, capability)) {
    throw new ForbiddenException("You do not have permission for this action");
  }
}

export function isAdmin(actor: Actor) {
  return actor.role === AppRole.admin;
}
