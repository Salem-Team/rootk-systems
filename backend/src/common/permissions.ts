import { PrismaService } from "../prisma/prisma.service";
import { isProtectedAdminAccount } from "./protected-accounts";
import {
  type PermissionId,
  hasAnyPermissionId,
  hasPermissionId,
  resolveEffectivePermissions,
} from "./permissions-catalog";

export {
  ALL_PERMISSION_IDS,
  CRM_CAPABILITY_TO_PERMISSION,
  ORGANIC_ADS_CAPABILITY_TO_PERMISSION,
  PERMISSION_CATALOG,
  TARGET_CAPABILITY_TO_PERMISSION,
  canViewOthersInModule,
  hasAnyPermissionId,
  hasPermissionId,
  isPermissionId,
  overridesFromEffective,
  permissionsForRole,
  resolveEffectivePermissions,
  type PermissionId,
  type PermissionOverride,
} from "./permissions-catalog";

export async function loadEffectivePermissions(
  prisma: PrismaService,
  user: {
    id: string;
    companyId: string;
    role: string;
    email?: string | null;
  }
): Promise<PermissionId[]> {
  const protectedAdmin = isProtectedAdminAccount({
    userId: user.id,
    email: user.email,
  });
  if (protectedAdmin) {
    return resolveEffectivePermissions(user.role, [], { protectedAdmin: true });
  }
  const overrides = await prisma.userPermissionOverride.findMany({
    where: { userId: user.id, companyId: user.companyId },
    select: { permissionId: true, granted: true },
  });
  return resolveEffectivePermissions(user.role, overrides);
}

export function userHasPermission(
  user: { permissions?: string[]; role?: string },
  id: PermissionId
): boolean {
  return hasPermissionId(id, user.permissions, user.role);
}

export function userHasAnyPermission(
  user: { permissions?: string[]; role?: string },
  ids: readonly PermissionId[]
): boolean {
  return hasAnyPermissionId(ids, user.permissions, user.role);
}
