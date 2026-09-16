"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  permissionsForRole,
  type PermissionId,
} from "@/constants/permissions";
import { AppRole } from "@/constants/roles";
import { isApiMode } from "@/lib/env";
import {
  crmSessionPersistStorage,
  writeSessionPersistSnapshotSync,
} from "@/lib/native/session-persist";
import {
  resolveAccountFirstName,
  resolveAccountFullName,
} from "@/lib/user-display-name";
import type { AppUser, UserRole } from "@/types";

export interface SessionUser {
  id: string;
  employeeId: string;
  /** Real account owner name from auth payload / DB. */
  displayName: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  initials: string;
  /** Legacy demo keys — unused when displayName is set. */
  nameKey: string;
  firstNameKey: string;
}

export interface AuthTokens {
  accessToken: string | null;
  refreshToken: string | null;
}

export interface ImpersonationState {
  impersonatorId: string;
  impersonatorName: string;
  impersonatorEmail: string;
}

function emptySessionUser(): SessionUser {
  return {
    id: "",
    employeeId: "",
    displayName: "User",
    firstName: "User",
    lastName: "",
    email: "",
    role: AppRole.admin,
    initials: "U",
    nameKey: "",
    firstNameKey: "",
  };
}

function fromAppUser(user: AppUser): SessionUser {
  const email = typeof user.email === "string" ? user.email : "";
  const displayName =
    user.displayName?.trim() ||
    resolveAccountFullName(user) ||
    (email.includes("@") ? email.split("@")[0] : "") ||
    email ||
    "User";
  const firstName =
    user.firstName?.trim() ||
    resolveAccountFirstName({ ...user, displayName, email }) ||
    displayName;
  return {
    id: user.id || "",
    employeeId: user.employeeId || "",
    displayName,
    firstName,
    lastName: user.lastName?.trim() || "",
    email,
    role: user.role || AppRole.employee,
    initials: user.initials || displayName.slice(0, 2).toUpperCase(),
    nameKey: user.nameKey || "",
    firstNameKey: user.firstNameKey || "",
  };
}

const EMPTY_USER: SessionUser = emptySessionUser();

interface SessionState {
  role: UserRole;
  user: SessionUser;
  authenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  permissions: PermissionId[];
  /** Present while admin is viewing as another user. */
  impersonation: ImpersonationState | null;
  /** True after zustand persist finished reading storage (client only). */
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  /** Apply auth payload (JWT or local session). */
  applyAuthSession: (input: {
    user: AppUser | SessionUser;
    role: UserRole;
    accessToken: string;
    refreshToken?: string | null;
    permissions?: PermissionId[] | string[] | null;
    impersonation?: ImpersonationState | null;
  }) => void;
  setPermissions: (permissions: PermissionId[]) => void;
  setTokens: (tokens: AuthTokens) => void;
  setImpersonation: (impersonation: ImpersonationState | null) => void;
  signOut: () => void;
  isAdmin: () => boolean;
  isEmployee: () => boolean;
  isImpersonating: () => boolean;
}

/**
 * UI + auth session.
 * Role comes from the active account; impersonation keeps the real admin id for exit.
 */
export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      role: AppRole.admin,
      user: EMPTY_USER,
      authenticated: false,
      accessToken: null,
      refreshToken: null,
      permissions: permissionsForRole(AppRole.admin),
      impersonation: null,
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      applyAuthSession: ({
        user,
        role,
        accessToken,
        refreshToken,
        permissions,
        impersonation,
      }) =>
        set({
          authenticated: true,
          role,
          user: fromAppUser(user as AppUser),
          accessToken,
          refreshToken: refreshToken ?? null,
          permissions: Array.isArray(permissions)
            ? (permissions.filter(Boolean) as PermissionId[])
            : permissionsForRole(role),
          impersonation: impersonation ?? null,
        }),
      setPermissions: (permissions) => set({ permissions }),
      setTokens: ({ accessToken, refreshToken }) =>
        set({
          accessToken,
          refreshToken,
          // Sticky recover / silent refresh must restore a live session flag.
          ...(accessToken || refreshToken ? { authenticated: true } : {}),
        }),
      setImpersonation: (impersonation) => set({ impersonation }),
      signOut: () =>
        set({
          authenticated: false,
          role: AppRole.admin,
          user: EMPTY_USER,
          accessToken: null,
          refreshToken: null,
          permissions: permissionsForRole(AppRole.admin),
          impersonation: null,
        }),
      isAdmin: () => get().role === AppRole.admin,
      isEmployee: () => get().role === AppRole.employee,
      isImpersonating: () => Boolean(get().impersonation),
    }),
    {
      name: "rootk-session",
      storage: crmSessionPersistStorage,
      partialize: (state) => ({
        role: state.role,
        authenticated: state.authenticated,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        permissions: state.permissions,
        impersonation: state.impersonation,
      }),
      merge: (persisted, current) => {
        const p = persisted as
          | Partial<
              Pick<
                SessionState,
                | "role"
                | "authenticated"
                | "accessToken"
                | "refreshToken"
                | "user"
                | "permissions"
                | "impersonation"
              >
            >
          | undefined;
        const rawUser = p?.user;
        const user =
          rawUser &&
          typeof rawUser === "object" &&
          typeof (rawUser as { email?: unknown }).email === "string"
            ? fromAppUser(rawUser as AppUser)
            : current.user;
        const role = p?.role ?? current.role;
        const impersonation =
          p?.impersonation &&
          typeof p.impersonation === "object" &&
          typeof p.impersonation.impersonatorId === "string"
            ? p.impersonation
            : null;
        const accessToken =
          typeof p?.accessToken === "string" && p.accessToken
            ? p.accessToken
            : null;
        const refreshToken =
          typeof p?.refreshToken === "string" && p.refreshToken
            ? p.refreshToken
            : null;
        // Never clobber a live signed-in session with an incomplete snapshot
        // (e.g. concurrent rehydrate while Keychain read is still empty).
        if (
          current.authenticated &&
          (current.accessToken || current.refreshToken) &&
          !accessToken &&
          !refreshToken
        ) {
          return current;
        }
        // API mode: tokens are the source of truth (Keychain may rebuild without the flag).
        const hasTokens = Boolean(accessToken || refreshToken);
        const authenticated = isApiMode()
          ? hasTokens
          : Boolean(p?.authenticated);
        return {
          ...current,
          role,
          user,
          authenticated,
          accessToken,
          refreshToken,
          permissions: Array.isArray(p?.permissions)
            ? p.permissions
            : permissionsForRole(role),
          impersonation: authenticated ? impersonation : null,
        };
      },
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          console.warn("[session] rehydrate failed", error);
        }
        // Persist finished (success or empty). Safe to gate routes now.
        useSessionStore.setState({ hasHydrated: true });
      },
    }
  )
);

export function getSessionUserId(): string {
  return useSessionStore.getState().user.id;
}

export function getSessionRole(): UserRole {
  return useSessionStore.getState().role;
}

export function getSessionPermissions(): PermissionId[] {
  const state = useSessionStore.getState();
  if (!state.authenticated) return [];
  return Array.isArray(state.permissions) ? state.permissions : [];
}

/** Session grants when signed in; `undefined` lets role defaults apply (scripts/tests). */
export function authPermissionSet(): PermissionId[] | undefined {
  const state = useSessionStore.getState();
  if (!state.authenticated) return undefined;
  return state.permissions;
}

/**
 * Employee entity id used in work assignee/participant fields.
 * Local demo: same as `user.id` (e.g. emp-003).
 * API mode: linked `user.employeeId` (User.sub is a separate cuid).
 */
export function getWorkEmployeeIdFromUser(
  user: Pick<SessionUser, "id" | "employeeId">
): string {
  if (isApiMode()) {
    if (!user.employeeId) {
      console.warn(
        "[session] API mode user missing employeeId — employee feeds will be empty"
      );
      return "";
    }
    return user.employeeId;
  }
  return user.id;
}

export function getWorkEmployeeId(): string {
  return getWorkEmployeeIdFromUser(useSessionStore.getState().user);
}

export function getAccessToken(): string | null {
  return useSessionStore.getState().accessToken;
}

export function getRefreshToken(): string | null {
  return useSessionStore.getState().refreshToken;
}

/**
 * True when the user should be treated as signed in.
 * API mode: any live token counts (flag alone is not enough; tokens alone are).
 */
export function hasActiveSession(
  state: Pick<
    SessionState,
    "authenticated" | "accessToken" | "refreshToken"
  > = useSessionStore.getState()
): boolean {
  if (!isApiMode()) return state.authenticated;
  return Boolean(state.accessToken || state.refreshToken);
}

export function isImpersonatingSession(): boolean {
  return Boolean(useSessionStore.getState().impersonation);
}

/** Persist name used by zustand — keep in sync with `persist({ name })`. */
export const SESSION_PERSIST_KEY = "rootk-session";

/**
 * Force-write the current session to WebView storage before navigation.
 * Keychain mirror runs in the background — never blocks login.
 */
export async function flushSessionPersist(): Promise<void> {
  const s = useSessionStore.getState();
  writeSessionPersistSnapshotSync(SESSION_PERSIST_KEY, {
    state: {
      role: s.role,
      authenticated: s.authenticated,
      accessToken: s.accessToken,
      refreshToken: s.refreshToken,
      user: s.user,
      permissions: s.permissions,
      impersonation: s.impersonation,
    },
    version: 0,
  });
}

/** True when JWT is missing, malformed, or expires within `skewMs`. */
export function isAccessTokenExpiringSoon(
  token: string | null | undefined,
  skewMs = 5 * 60_000
): boolean {
  if (!token || !token.includes(".")) return true;
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return true;
    const json = JSON.parse(
      atob(payloadPart.replace(/-/g, "+").replace(/_/g, "/"))
    ) as { exp?: number };
    if (typeof json.exp !== "number") return true;
    return json.exp * 1000 - Date.now() <= skewMs;
  } catch {
    return true;
  }
}
