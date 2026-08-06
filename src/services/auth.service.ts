import {
  changePasswordRemote,
  fetchMe,
  loginWithCredentials,
  logoutRemote,
  refreshSession,
  type AuthSessionPayload,
} from "@/api/auth.api";
import { isApiMode } from "@/lib/env";
import { DEMO_PASSWORD } from "@/lib/demo-auth";
import {
  getLocalCredential,
  setLocalCredential,
  verifyLocalCredential,
} from "@/lib/local-credentials";
import { createAuditFields } from "@/lib/entity";
import { fail, fromError, ok } from "@/services/api-result";
import { simulateDelay } from "@/services/fake-api";
import { usersSeed } from "@/mocks/users";
import { userRepository } from "@/repositories";
import {
  useSessionStore,
  type SessionUser,
} from "@/stores/session-store";
import type { ApiResponse, AppUser, UserRole } from "@/types";

function seedUserToAppUser(
  seed: (typeof usersSeed)[number]
): AppUser {
  return {
    ...seed,
    companyId: "cmp_rootk_001",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: "system",
    updatedBy: "system",
    deletedAt: null,
    isArchived: false,
    version: 1,
    metadata: {},
  };
}

function emptyAuthPayload(): AuthSessionPayload {
  return {
    user: seedUserToAppUser(usersSeed[1] ?? usersSeed[0]),
    role: "employee",
    tokens: { accessToken: "" },
  };
}

function applyPayload(payload: AuthSessionPayload): void {
  useSessionStore.getState().applyAuthSession({
    user: payload.user,
    role: payload.role,
    accessToken: payload.tokens.accessToken,
    refreshToken: payload.tokens.refreshToken ?? null,
  });
}

function toSessionPayload(user: AppUser): AuthSessionPayload {
  return {
    user,
    role: user.role,
    tokens: {
      accessToken: `demo.${user.role}.${user.id}`,
      refreshToken: `demo-refresh.${user.role}.${user.id}`,
    },
  };
}

/** Ensure seed users exist in local storage with demo credentials. */
async function ensureLocalSeedUsers(): Promise<void> {
  for (const seed of usersSeed) {
    const email = seed.email.toLowerCase();
    const existing = await userRepository.findByEmail(email);
    if (!existing) {
      await userRepository.create(seedUserToAppUser(seed));
    }
    if (!getLocalCredential(email)) {
      setLocalCredential(email, DEMO_PASSWORD);
    }
  }
}

/** POST /auth/login — email + password. */
export async function signInWithCredentials(input: {
  email: string;
  password: string;
}): Promise<ApiResponse<AuthSessionPayload>> {
  try {
    if (!isApiMode()) {
      await simulateDelay(280);
      await ensureLocalSeedUsers();
      const email = input.email.trim().toLowerCase();
      const match = await userRepository.findByEmail(email);
      if (!match || !match.isActive || match.deletedAt) {
        return fail(
          emptyAuthPayload(),
          "Invalid email or password",
          "UNAUTHORIZED"
        );
      }
      if (!verifyLocalCredential(email, input.password)) {
        return fail(
          emptyAuthPayload(),
          "Invalid email or password",
          "UNAUTHORIZED"
        );
      }
      const payload = toSessionPayload(match);
      applyPayload(payload);
      return ok(payload, "Signed in");
    }

    const res = await loginWithCredentials(input);
    if (res.success) applyPayload(res.data);
    return res;
  } catch (error) {
    return fromError(error, emptyAuthPayload());
  }
}

/** POST /auth/change-password — current user only. */
export async function changeOwnPassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<ApiResponse<boolean>> {
  try {
    if (input.newPassword.trim().length < 6) {
      return fail(false, "Password must be at least 6 characters", "VALIDATION");
    }
    if (input.currentPassword === input.newPassword) {
      return fail(
        false,
        "New password must be different from the current password",
        "VALIDATION"
      );
    }

    if (!isApiMode()) {
      await simulateDelay(220);
      const session = useSessionStore.getState();
      if (!session.authenticated) {
        return fail(false, "Not authenticated", "UNAUTHORIZED");
      }
      const email = session.user.email.toLowerCase();
      if (!verifyLocalCredential(email, input.currentPassword)) {
        return fail(false, "Current password is incorrect", "UNAUTHORIZED");
      }
      setLocalCredential(email, input.newPassword.trim());
      return ok(true, "Password updated");
    }

    return changePasswordRemote(input);
  } catch (error) {
    return fromError(error, false);
  }
}

/** Refresh access token (api mode). */
export async function refreshAccessToken(): Promise<string | null> {
  const refresh = useSessionStore.getState().refreshToken;
  if (!refresh) return null;

  if (!isApiMode()) {
    const role = useSessionStore.getState().role;
    const user = useSessionStore.getState().user;
    const next = `demo.${role}.${user.id}`;
    useSessionStore.getState().setTokens({
      accessToken: next,
      refreshToken: refresh,
    });
    return next;
  }

  const res = await refreshSession(refresh);
  if (!res.success || !res.data.accessToken) return null;
  useSessionStore.getState().setTokens({
    accessToken: res.data.accessToken,
    refreshToken: res.data.refreshToken ?? refresh,
  });
  return res.data.accessToken;
}

/** Sign out locally + optionally revoke remote session. */
export async function signOutSession(): Promise<ApiResponse<boolean>> {
  try {
    if (isApiMode() && useSessionStore.getState().accessToken) {
      await logoutRemote(useSessionStore.getState().refreshToken);
    }
    useSessionStore.getState().signOut();
    return ok(true, "Signed out");
  } catch (error) {
    useSessionStore.getState().signOut();
    return fromError(error, false);
  }
}

/**
 * Hydrate session from GET /auth/me (api mode).
 * Call on app boot when an access token is already persisted.
 */
export async function hydrateCurrentUser(): Promise<ApiResponse<AppUser | null>> {
  if (!isApiMode()) {
    return ok(null);
  }
  if (!useSessionStore.getState().accessToken) {
    return ok(null);
  }
  try {
    const res = await fetchMe();
    if (res.success && res.data) {
      const current = useSessionStore.getState();
      current.applyAuthSession({
        user: res.data,
        role: res.data.role,
        accessToken: current.accessToken ?? "",
        refreshToken: current.refreshToken,
      });
    }
    return res;
  } catch (error) {
    return fromError(error, null);
  }
}

/** Create a local login account when HR adds an employee (local mode). */
export async function provisionLocalEmployeeAccount(input: {
  employeeId: string;
  email: string;
  name: string;
  password: string;
  actorId: string;
}): Promise<AppUser> {
  const email = input.email.trim().toLowerCase();
  const existing = await userRepository.findByEmail(email, {
    includeInactive: true,
  });
  if (existing && !existing.deletedAt && existing.isActive) {
    throw new Error("A login account with this email already exists");
  }

  const initials = input.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  const user: AppUser = {
    id: existing?.id ?? input.employeeId,
    employeeId: input.employeeId,
    email,
    role: "employee" as UserRole,
    initials: initials || "EM",
    nameKey: "user.employeeFullName",
    firstNameKey: "user.employeeFirstName",
    isActive: true,
    ...createAuditFields(input.actorId),
    ...(existing
      ? {
          createdAt: existing.createdAt,
          createdBy: existing.createdBy,
          version: existing.version + 1,
          deletedAt: null,
          isArchived: false,
        }
      : {}),
  };

  if (existing) {
    await userRepository.update(existing.id, user);
  } else {
    await userRepository.create(user);
  }
  setLocalCredential(email, input.password.trim());
  return user;
}

/** Reset local password for an employee account (admin). */
export async function resetLocalEmployeePassword(
  email: string,
  password: string
): Promise<void> {
  setLocalCredential(email.trim().toLowerCase(), password.trim());
}

export type { SessionUser };
