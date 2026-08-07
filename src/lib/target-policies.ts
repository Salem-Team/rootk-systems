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
  return role === "admin" ? ALL : EMPLOYEE;
}

export function canTarget(
  role: UserRole,
  capability: TargetCapability
): boolean {
  return targetCapabilitiesForRole(role).includes(capability);
}
