import {
  changePasswordRemote,
  fetchMe,
  loginWithCredentials,
  logoutRemote,
  refreshSession,
  updateMyProfile,
  type AuthSessionPayload,
  type ProfileUpdatePayload,
} from "@/api/auth.api";
import { DEFAULT_COMPANY_ID } from "@/constants/company";
import {
  resolveEffectivePermissions,
  type PermissionId,
} from "@/constants/permissions";
import { AppRole } from "@/constants/roles";
import { isProtectedAdminAccount } from "@/lib/protected-accounts";
import { permissionsRepository } from "@/repositories/permissions.repository";
import { isApiMode } from "@/lib/env";
import { DEMO_PASSWORD } from "@/lib/demo-auth";
import {
  getLocalCredential,
  setLocalCredential,
  verifyLocalCredential,
} from "@/lib/local-credentials";
import { createAuditFields, touchEntity } from "@/lib/entity";
import { resolveAccountFullName } from "@/lib/user-display-name";
import { fail, fromError, ok } from "@/services/api-result";
import { simulateDelay } from "@/services/fake-api";
import { usersSeed } from "@/mocks/users";
import { employeeRepository, userRepository } from "@/repositories";
import {
  getWorkEmployeeIdFromUser,
  useSessionStore,
  type SessionUser,
} from "@/stores/session-store";
import type { ApiResponse, AppUser, UserRole } from "@/types";

function seedUserToAppUser(
  seed: (typeof usersSeed)[number]
): AppUser {
  return {
    ...seed,
    companyId: DEFAULT_COMPANY_ID,
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
    role: AppRole.employee,
    tokens: { accessToken: "" },
  };
}

function applyPayload(payload: AuthSessionPayload): void {
  useSessionStore.getState().applyAuthSession({
    user: payload.user,
    role: payload.role,
    accessToken: payload.tokens.accessToken,
    refreshToken: payload.tokens.refreshToken ?? null,
    permissions: payload.permissions,
  });
}

function toSessionPayload(
  user: AppUser,
  permissions?: PermissionId[]
): AuthSessionPayload {
  return {
    user,
    role: user.role,
    tokens: {
      accessToken: `demo.${user.role}.${user.id}`,
      refreshToken: `demo-refresh.${user.role}.${user.id}`,
    },
    permissions,
  };
}

async function localPermissionsFor(user: AppUser): Promise<PermissionId[]> {
  const stored = await permissionsRepository.findByUserId(user.id);
  return resolveEffectivePermissions(user.role, stored, {
    protectedAdmin: isProtectedAdminAccount({
      userId: user.id,
      employeeId: user.employeeId,
      email: user.email,
    }),
  });
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
      const payload = toSessionPayload(match, await localPermissionsFor(match));
      applyPayload(payload);
      return ok(payload, "Signed in");
    }

    const res = await loginWithCredentials(input);
    if (res.success) {
      if (!res.data?.tokens?.accessToken) {
        return fail(
          emptyAuthPayload(),
          "Invalid email or password",
          "UNAUTHORIZED"
        );
      }
      applyPayload(res.data);
    }
    return res;
  } catch (error) {
    return fromError(error, emptyAuthPayload());
  }
}

function initialsFromName(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "U"
  );
}

/** POST /auth/profile — update signed-in profile fields. */
export async function updateOwnProfile(input: {
  firstName: string;
  lastName?: string;
  phone?: string;
}): Promise<ApiResponse<ProfileUpdatePayload>> {
  const firstName = input.firstName.trim();
  const lastName = (input.lastName ?? "").trim();
  const phone = (input.phone ?? "").trim();

  if (!firstName) {
    return fail(
      { user: emptyAuthPayload().user, phone: "" },
      "First name is required",
      "VALIDATION"
    );
  }

  try {
    if (isApiMode()) {
      const res = await updateMyProfile({ firstName, lastName, phone });
      if (res.success && res.data?.user) {
        const current = useSessionStore.getState();
        current.applyAuthSession({
          user: res.data.user,
          role: res.data.user.role,
          accessToken: current.accessToken ?? "",
          refreshToken: current.refreshToken,
          permissions: current.permissions,
        });
      }
      return res;
    }

    await simulateDelay(220);
    const session = useSessionStore.getState();
    if (!session.authenticated) {
      return fail(
        { user: emptyAuthPayload().user, phone: "" },
        "Not authenticated",
        "UNAUTHORIZED"
      );
    }

    const existing = await userRepository.findById(session.user.id);
    if (!existing || !existing.isActive || existing.deletedAt) {
      return fail(
        { user: emptyAuthPayload().user, phone: "" },
        "User not found",
        "NOT_FOUND"
      );
    }

    const displayName = resolveAccountFullName({ firstName, lastName });
    const nextUser = touchEntity(
      {
        ...existing,
        firstName,
        lastName,
        displayName,
        initials: initialsFromName(displayName || firstName),
      },
      session.user.id
    );
    const saved = await userRepository.update(existing.id, nextUser);
    if (!saved) {
      return fail(
        { user: emptyAuthPayload().user, phone: "" },
        "User not found",
        "NOT_FOUND"
      );
    }

    let phoneOut = phone;
    const employeeId = getWorkEmployeeIdFromUser(saved);
    if (employeeId) {
      const employee = await employeeRepository.findById(employeeId);
      if (employee) {
        const nextEmployee = touchEntity(
          {
            ...employee,
            name: displayName || employee.name,
            phone,
          },
          session.user.id
        );
        const savedEmployee = await employeeRepository.update(
          employee.id,
          nextEmployee
        );
        phoneOut = savedEmployee?.phone ?? phone;
      }
    }

    session.applyAuthSession({
      user: saved,
      role: saved.role,
      accessToken: session.accessToken ?? "",
      refreshToken: session.refreshToken,
      permissions: session.permissions,
    });

    return ok({ user: saved, phone: phoneOut }, "Profile updated");
  } catch (error) {
    return fromError(error, { user: emptyAuthPayload().user, phone: "" });
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
      const payload = res.data as AppUser & { permissions?: PermissionId[] };
      current.applyAuthSession({
        user: payload,
        role: payload.role,
        accessToken: current.accessToken ?? "",
        refreshToken: current.refreshToken,
        permissions: payload.permissions,
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
    displayName: input.name.trim(),
    firstName: input.name.trim().split(/\s+/)[0] || input.name.trim(),
    lastName: input.name.trim().split(/\s+/).slice(1).join(" ") || undefined,
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
