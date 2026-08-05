import {
  fetchUserById,
  fetchUserByRole,
  fetchUsers,
} from "@/api/users.api";
import { isApiMode } from "@/lib/env";
import { userRepository } from "@/repositories";
import { fail, fromError, ok } from "@/services/api-result";
import type { ApiResponse, AppUser, UserRole } from "@/types";

/** GET /users */
export async function getUsers(): Promise<ApiResponse<AppUser[]>> {
  if (isApiMode()) return fetchUsers();
  try {
    return ok(await userRepository.findAll());
  } catch (error) {
    return fromError(error, []);
  }
}

/** GET /users/:id */
export async function getUserById(
  id: string
): Promise<ApiResponse<AppUser | null>> {
  if (isApiMode()) return fetchUserById(id);
  try {
    const user = await userRepository.findById(id);
    if (!user) return fail(null, "User not found", "NOT_FOUND");
    return ok(user);
  } catch (error) {
    return fromError(error, null);
  }
}

/** GET /users?role= */
export async function getUserByRole(
  role: UserRole
): Promise<ApiResponse<AppUser | null>> {
  if (isApiMode()) return fetchUserByRole(role);
  try {
    return ok(await userRepository.findByRole(role));
  } catch (error) {
    return fromError(error, null);
  }
}
