import { ORGANIC_ADS_CAPABILITY_TO_PERMISSION } from "@/constants/permissions";
import { AppRole } from "@/constants/roles";
import type { OrganicAdsCapability } from "@/types/organic-ads";
import type { UserRole } from "@/types";

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

/** Role → capability map. Admin ≈ Sales Manager; employee ≈ Sales user. */
export function organicAdsCapabilitiesForRole(
  role: UserRole
): OrganicAdsCapability[] {
  return role === AppRole.admin ? ADMIN : EMPLOYEE;
}

export function canOrganicAds(
  role: UserRole,
  capability: OrganicAdsCapability,
  permissions?: readonly string[]
): boolean {
  if (permissions) {
    return permissions.includes(ORGANIC_ADS_CAPABILITY_TO_PERMISSION[capability]);
  }
  return organicAdsCapabilitiesForRole(role).includes(capability);
}
