import type { AppRoleName } from "../common/roles";
import { AppRole } from "../common/roles";
import { TARGET_CAPABILITY_TO_PERMISSION } from "../common/permissions-catalog";

export type TargetCapability =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "assign"
  | "manage_categories"
  | "manage_types"
  | "manage_templates"
  | "view_dashboard"
  | "view_reports"
  | "send_warnings"
  | "manage_penalties"
  | "view_delayed"
  | "export";

const ALL: TargetCapability[] = [
  "view",
  "create",
  "edit",
  "delete",
  "assign",
  "manage_categories",
  "manage_types",
  "manage_templates",
  "view_dashboard",
  "view_reports",
  "send_warnings",
  "manage_penalties",
  "view_delayed",
  "export",
];

const EMPLOYEE: TargetCapability[] = ["view", "view_dashboard", "view_delayed"];

export function targetCapabilitiesForRole(
  role: AppRoleName | string
): TargetCapability[] {
  return role === AppRole.admin ? ALL : EMPLOYEE;
}

export function canTarget(
  role: AppRoleName | string,
  capability: TargetCapability,
  permissions?: readonly string[]
): boolean {
  if (permissions) {
    return permissions.includes(TARGET_CAPABILITY_TO_PERMISSION[capability]);
  }
  return targetCapabilitiesForRole(role).includes(capability);
}
