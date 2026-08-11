import type { PermissionId, PermissionOverride } from "@/constants/permissions";
import type { AppUser, UserRole } from "@/types";

export type { PermissionId, PermissionOverride };

export interface UserPermissionSummary {
  user: AppUser;
  role: UserRole;
  isProtected: boolean;
  overrideCount: number;
  grantedCount: number;
}

export interface UserPermissionDetail {
  user: AppUser;
  role: UserRole;
  isProtected: boolean;
  defaults: PermissionId[];
  overrides: PermissionOverride[];
  effective: PermissionId[];
}
