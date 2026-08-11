import { SetMetadata } from "@nestjs/common";
import type { PermissionId } from "./permissions-catalog";

export const PERMISSIONS_KEY = "permissions";

/** Require any of the listed permissions (OR). */
export const RequirePermission = (...permissions: PermissionId[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
