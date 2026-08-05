import {
  demoLogin,
  fetchMe,
  loginWithCredentials,
  logoutRemote,
  refreshSession,
  type AuthSessionPayload,
} from "@/api/auth.api";
import { isApiMode } from "@/lib/env";
import { DEMO_PASSWORD } from "@/lib/demo-auth";
import { fail, fromError, ok } from "@/services/api-result";
import { simulateDelay } from "@/services/fake-api";
import { usersSeed } from "@/mocks/users";
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

function seedToAppUser(role: UserRole): AppUser {
  const seed = usersSeed.find((u) => u.role === role) ?? usersSeed[0];
  return seedUserToAppUser(seed);
}

function emptyAuthPayload(): AuthSessionPayload {
  return {
    user: seedToAppUser("employee"),
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

/**
 * Demo / role login.
 * - local: Zustand session + demo token
 * - api: POST /auth/demo-login
 */
export async function signInWithRole(
  role: UserRole
): Promise<ApiResponse<AuthSessionPayload>> {
  try {
    if (isApiMode()) {
      const res = await demoLogin(role);
      if (res.success) applyPayload(res.data);
      return res;
    }

    useSessionStore.getState().signIn(role);
    const user = seedToAppUser(role);
    const payload: AuthSessionPayload = {
      user,
      role,
      tokens: {
        accessToken: `demo.${role}.${user.id}`,
        refreshToken: `demo-refresh.${role}`,
      },
    };
    return ok(payload, "Signed in");
  } catch (error) {
    return fromError(error, {
      user: seedToAppUser(role),
      role,
      tokens: { accessToken: "" },
    });
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
      const email = input.email.trim().toLowerCase();
      const match = usersSeed.find((u) => u.email.toLowerCase() === email);
      if (!match || input.password !== DEMO_PASSWORD) {
        return fail(
          emptyAuthPayload(),
          "Invalid email or password",
          "UNAUTHORIZED"
        );
      }
      const user = seedUserToAppUser(match);
      const payload: AuthSessionPayload = {
        user,
        role: match.role,
        tokens: {
          accessToken: `demo.${match.role}.${user.id}`,
          refreshToken: `demo-refresh.${match.role}`,
        },
      };
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

export type { SessionUser };
