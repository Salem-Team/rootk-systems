import { api } from "@/api/http";
import { API_ROUTES, toQuery } from "@/api/routes";
import type { ApiResponse, AppUser, UserRole } from "@/types";

/** GET /users */
export function fetchUsers(): Promise<ApiResponse<AppUser[]>> {
  return api.getList(API_ROUTES.users.root);
}

/** GET /users/:id */
export function fetchUserById(
  id: string
): Promise<ApiResponse<AppUser | null>> {
  return api.get(API_ROUTES.users.byId(id), null);
}

/** GET /users?role= — Nest may return a list; take the first match. */
export async function fetchUserByRole(
  role: UserRole
): Promise<ApiResponse<AppUser | null>> {
  const res = await api.getList<AppUser>(
    `${API_ROUTES.users.root}${toQuery({ role })}`
  );
  if (!res.success) {
    return { ...res, data: null };
  }
  return { ...res, data: res.data[0] ?? null };
}
