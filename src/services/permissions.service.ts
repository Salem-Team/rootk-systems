import {
  fetchMyPermissions,
  fetchPermissionUsers,
  fetchUserPermissions,
  saveUserPermissions,
} from "@/api/permissions.api";
import {
  ALL_PERMISSION_IDS,
  isPermissionId,
  overridesFromEffective,
  permissionsForRole,
  resolveEffectivePermissions,
  type PermissionId,
} from "@/constants/permissions";
import { isApiMode } from "@/lib/env";
import { isProtectedAdminAccount } from "@/lib/protected-accounts";
import { permissionsRepository } from "@/repositories/permissions.repository";
import { userRepository } from "@/repositories/user.repository";
import { fail, fromError, ok } from "@/services/api-result";
import { simulateDelay } from "@/services/fake-api";
import {
  getSessionRole,
  getSessionUserId,
  useSessionStore,
} from "@/stores/session-store";
import type {
  UserPermissionDetail,
  UserPermissionSummary,
} from "@/types/permissions";
import type { ApiResponse, AppUser } from "@/types";

function isProtectedUser(user: AppUser): boolean {
  return isProtectedAdminAccount({
    userId: user.id,
    employeeId: user.employeeId,
    email: user.email,
  });
}

async function localDetail(user: AppUser): Promise<UserPermissionDetail> {
  const protectedAdmin = isProtectedUser(user);
  const stored = await permissionsRepository.findByUserId(user.id);
  const effective = resolveEffectivePermissions(user.role, stored, {
    protectedAdmin,
  });
  return {
    user,
    role: user.role,
    isProtected: protectedAdmin,
    defaults: permissionsForRole(user.role),
    overrides: stored.map((row) => ({
      permissionId: row.permissionId,
      granted: row.granted,
    })),
    effective,
  };
}

function syncSessionIfCurrent(userId: string, effective: PermissionId[]) {
  if (getSessionUserId() !== userId) return;
  useSessionStore.getState().setPermissions(effective);
}

export async function getMyPermissions(): Promise<ApiResponse<PermissionId[]>> {
  try {
    if (isApiMode()) return fetchMyPermissions();
    await simulateDelay(80);
    const userId = getSessionUserId();
    const user = await userRepository.findById(userId);
    if (!user) return ok(permissionsForRole(getSessionRole()));
    const detail = await localDetail(user);
    return ok(detail.effective);
  } catch (error) {
    return fromError(error, permissionsForRole(getSessionRole()));
  }
}

export async function listPermissionUsers(): Promise<
  ApiResponse<UserPermissionSummary[]>
> {
  try {
    if (isApiMode()) return fetchPermissionUsers();
    await simulateDelay(120);
    const users = await userRepository.findAll();
    const rows: UserPermissionSummary[] = [];
    for (const user of users) {
      const detail = await localDetail(user);
      rows.push({
        user,
        role: user.role,
        isProtected: detail.isProtected,
        overrideCount: detail.overrides.length,
        grantedCount: detail.effective.length,
      });
    }
    rows.sort((a, b) => {
      if (a.role !== b.role) return a.role === "admin" ? -1 : 1;
      return (a.user.displayName || a.user.email).localeCompare(
        b.user.displayName || b.user.email
      );
    });
    return ok(rows);
  } catch (error) {
    return fromError(error, []);
  }
}

export async function getUserPermissions(
  userId: string
): Promise<ApiResponse<UserPermissionDetail | null>> {
  try {
    if (isApiMode()) return fetchUserPermissions(userId);
    await simulateDelay(100);
    const user = await userRepository.findById(userId);
    if (!user) return fail(null, "User not found", "NOT_FOUND");
    return ok(await localDetail(user));
  } catch (error) {
    return fromError(error, null);
  }
}

export async function updateUserPermissions(
  userId: string,
  effective: Iterable<string>
): Promise<ApiResponse<UserPermissionDetail | null>> {
  try {
    if (isApiMode()) {
      const userRes = await fetchUserPermissions(userId);
      const role = userRes.data?.role ?? "employee";
      const overrides = overridesFromEffective(role, effective);
      const saved = await saveUserPermissions(userId, overrides);
      if (saved.success && saved.data) {
        syncSessionIfCurrent(userId, saved.data.effective);
      }
      return saved;
    }
    await simulateDelay(160);
    const user = await userRepository.findById(userId);
    if (!user) return fail(null, "User not found", "NOT_FOUND");
    if (isProtectedUser(user)) {
      return fail(
        null,
        "The system admin account always keeps full access",
        "FORBIDDEN"
      );
    }
    const compact = overridesFromEffective(user.role, effective);
    await permissionsRepository.replaceForUser(userId, compact);
    const detail = await localDetail(user);
    syncSessionIfCurrent(userId, detail.effective);
    return ok(detail);
  } catch (error) {
    return fromError(error, null);
  }
}

export function countGranted(effective: Iterable<string>): {
  enabled: number;
  total: number;
} {
  const set = new Set([...effective].filter(isPermissionId));
  return { enabled: set.size, total: ALL_PERMISSION_IDS.length };
}
