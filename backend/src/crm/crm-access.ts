/** Actor identity + capability checks shared across all CRM domain services. */
import { ForbiddenException } from "@nestjs/common";
import type { AppRoleName } from "../common/roles";
import { canCrm, type CrmCapability } from "../lib/crm-policies";
import {
  resolveDataAccessScope,
  type DataAccessScope,
} from "../common/permissions-catalog";

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

export function crmLeadAccessScope(actor: Actor): DataAccessScope {
  return resolveDataAccessScope(
    actor.permissions,
    "crm.viewOthersLeads",
    "crm.viewTeamLeads",
    actor.role
  );
}

export function canViewOthersLeads(actor: Actor) {
  return crmLeadAccessScope(actor) === "all";
}

export function canInspectOtherOwners(actor: Actor) {
  return crmLeadAccessScope(actor) !== "own";
}

export function ownerIdAllowed(
  ownerIds: string[] | null,
  ownerId: string | null | undefined
): boolean {
  if (ownerIds === null) return true;
  if (!ownerId) return false;
  return ownerIds.includes(ownerId);
}
