import { api } from "@/api/http";
import { API_ROUTES } from "@/api/routes";
import type { PermissionId } from "@/constants/permissions";
import type {
  UserPermissionDetail,
  UserPermissionSummary,
} from "@/types/permissions";
import type { ApiResponse } from "@/types";

export function fetchMyPermissions(): Promise<ApiResponse<PermissionId[]>> {
  return api.get(API_ROUTES.permissions.me, []);
}

export function fetchPermissionUsers(): Promise<
  ApiResponse<UserPermissionSummary[]>
> {
  return api.getList(API_ROUTES.permissions.users);
}

export function fetchUserPermissions(
  userId: string
): Promise<ApiResponse<UserPermissionDetail | null>> {
  return api.get(API_ROUTES.permissions.userById(userId), null);
}

export function saveUserPermissions(
  userId: string,
  overrides: Array<{ permissionId: string; granted: boolean }>
): Promise<ApiResponse<UserPermissionDetail | null>> {
  return api.put(API_ROUTES.permissions.userById(userId), { overrides }, null);
}
