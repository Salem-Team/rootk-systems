import type { AppRoleName } from "../common/roles";
import { AppRole } from "../common/roles";

export type CrmCapability =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "assign"
  | "manage_stages"
  | "manage_feedback_types"
  | "manage_business_types"
  | "view_dashboard"
  | "view_reports"
  | "view_performance"
  | "view_audit"
  | "export";

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

/** Employees: view/create/edit own leads + scoped dashboard. */
const EMPLOYEE: CrmCapability[] = [
  "view",
  "create",
  "edit",
  "view_dashboard",
];

export function crmCapabilitiesForRole(
  role: AppRoleName | string
): CrmCapability[] {
  return role === AppRole.admin ? ADMIN : EMPLOYEE;
}

export function canCrm(
  role: AppRoleName | string,
  capability: CrmCapability
): boolean {
  return crmCapabilitiesForRole(role).includes(capability);
}
