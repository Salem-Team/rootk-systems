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

export function canCrm(role: UserRole, capability: CrmCapability): boolean {
  return crmCapabilitiesForRole(role).includes(capability);
}
