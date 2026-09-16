import { CRM_CAPABILITY_TO_PERMISSION } from "@/constants/permissions";
import { AppRole } from "@/constants/roles";
import type { CrmCapability } from "@/types/crm";
import type { UserRole } from "@/types";

const ADMIN: CrmCapability[] = [
  "view",
  "create",
  "edit",
  "delete",
  "assign",
  "manage_stages",
  "manage_feedback_types",
  "manage_business_types",
  "view_dashboard",
  "view_reports",
  "view_performance",
  "view_audit",
  "export",
];

const EMPLOYEE: CrmCapability[] = [
  "view",
  "create",
  "edit",
  "view_dashboard",
];

/** Admin ≈ CRM manager; employee ≈ Sales user (own leads). */
export function crmCapabilitiesForRole(role: UserRole): CrmCapability[] {
  return role === AppRole.admin ? ADMIN : EMPLOYEE;
}

export function canCrm(
  role: UserRole,
  capability: CrmCapability,
  permissions?: readonly string[]
): boolean {
  if (permissions) {
    return permissions.includes(CRM_CAPABILITY_TO_PERMISSION[capability]);
  }
  return crmCapabilitiesForRole(role).includes(capability);
}

/** Employees always own leads they create (even if they have assign). */
export function mustOwnCreatedCrmLead(
  role: UserRole,
  permissions?: readonly string[]
): boolean {
  if (role === AppRole.employee) return true;
  return !canCrm(role, "assign", permissions);
}
