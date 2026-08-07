import type { AppRoleName } from "../common/roles";
import { AppRole } from "../common/roles";

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
  capability: TargetCapability
): boolean {
  return targetCapabilitiesForRole(role).includes(capability);
}
