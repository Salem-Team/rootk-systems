/** Actor identity + capability checks shared across all CRM domain services. */
import { ForbiddenException } from "@nestjs/common";
import type { AppRoleName } from "../common/roles";
import { AppRole } from "../common/roles";
import { canCrm, type CrmCapability } from "../lib/crm-policies";
import { canViewOthersInModule } from "../common/permissions-catalog";

export type Actor = {
  userId: string;
  role: AppRoleName;
  employeeId: string;
  permissions?: string[];
};

export function assertCap(actor: Actor, capability: CrmCapability) {
  if (!canCrm(actor.role, capability, actor.permissions)) {
    throw new ForbiddenException("You do not have permission for this action");
  }
}

export function isAdmin(actor: Actor) {
  return actor.role === AppRole.admin;
}

export function canViewOthersLeads(actor: Actor) {
  return canViewOthersInModule(
    actor.permissions,
    "crm.viewOthersLeads"
  ).all;
}
