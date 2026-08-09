import type { AppRoleName } from "../common/roles";
import { AppRole } from "../common/roles";

export type OrganicAdsCapability =
  | "view_own"
  | "view_team"
  | "create"
  | "edit_own"
  | "edit_team"
  | "delete_own"
  | "delete_team"
  | "view_performance"
  | "view_validation"
  | "override_duplicate"
  | "manage_settings"
  | "view_audit";

const ADMIN: OrganicAdsCapability[] = [
  "view_own",
  "view_team",
  "create",
  "edit_own",
  "edit_team",
  "delete_own",
  "delete_team",
  "view_performance",
  "view_validation",
  "override_duplicate",
  "manage_settings",
  "view_audit",
];

const EMPLOYEE: OrganicAdsCapability[] = [
  "view_own",
  "create",
  "edit_own",
  "delete_own",
  "view_validation",
];

export function organicAdsCapabilitiesForRole(
  role: AppRoleName | string
): OrganicAdsCapability[] {
  return role === AppRole.admin ? ADMIN : EMPLOYEE;
}

export function canOrganicAds(
  role: AppRoleName | string,
  capability: OrganicAdsCapability
): boolean {
  return organicAdsCapabilitiesForRole(role).includes(capability);
}
