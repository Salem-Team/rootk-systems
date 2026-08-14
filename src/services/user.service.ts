import {
  fetchUserById,
  fetchUserByRole,
  fetchUserAccounts,
  fetchUsers,
  putUserLoginPassword,
} from "@/api/users.api";
import { isApiMode } from "@/lib/env";
import {
  getLocalCredential,
  setLocalCredential,
} from "@/lib/local-credentials";
import { userRepository } from "@/repositories";
import { fail, fromError, ok } from "@/services/api-result";
import type {
  ApiResponse,
  AppUser,
  UserLoginAccount,
  UserRole,
} from "@/types";

/** GET /users */
export async function getUsers(): Promise<ApiResponse<AppUser[]>> {
  if (isApiMode()) return fetchUsers();
  try {
    return ok(await userRepository.findAll());
  } catch (error) {
    return fromError(error, []);
  }
}

/** GET /users/accounts */
export async function getUserAccounts(): Promise<
  ApiResponse<UserLoginAccount[]>
> {
  if (isApiMode()) return fetchUserAccounts();
  try {
    const users = await userRepository.findAll();
    return ok(
      users.map((user) => ({
        ...user,
        loginPassword: getLocalCredential(user.email),
      }))
    );
  } catch (error) {
    return fromError(error, []);
  }
}

/** PUT /users/:id/login-password */
export async function setUserLoginPassword(
  id: string,
  password: string
): Promise<ApiResponse<UserLoginAccount | null>> {
  if (isApiMode()) return putUserLoginPassword(id, password);
  try {
    const user = await userRepository.findById(id);
    if (!user) return fail(null, "User not found", "NOT_FOUND");
    const next = password.trim();
    if (next.length < 6) {
      return fail(null, "Password must be at least 6 characters", "VALIDATION");
    }
    setLocalCredential(user.email, next);
    return ok({ ...user, loginPassword: next });
  } catch (error) {
    return fromError(error, null);
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
