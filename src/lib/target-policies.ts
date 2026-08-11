import { TARGET_CAPABILITY_TO_PERMISSION } from "@/constants/permissions";
import { AppRole } from "@/constants/roles";
import type { TargetCapability } from "@/types/targets";
import type { UserRole } from "@/types";

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

const EMPLOYEE: TargetCapability[] = [
  "view",
  "view_dashboard",
  "view_delayed",
];

/** Role → capability map (extensible to fine-grained RBAC later). */
export function targetCapabilitiesForRole(role: UserRole): TargetCapability[] {
  return role === AppRole.admin ? ALL : EMPLOYEE;
}

export function canTarget(
  role: UserRole,
  capability: TargetCapability,
  permissions?: readonly string[]
): boolean {
  if (permissions) {
    return permissions.includes(TARGET_CAPABILITY_TO_PERMISSION[capability]);
  }
  return targetCapabilitiesForRole(role).includes(capability);
}
