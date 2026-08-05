"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { isApiMode } from "@/lib/env";
import { usersSeed } from "@/mocks/users";
import type { AppUser, UserRole } from "@/types";

export interface SessionUser {
  id: string;
  employeeId: string;
  nameKey: "user.adminFullName" | "user.employeeFullName";
  firstNameKey: "user.adminFirstName" | "user.employeeFirstName";
  email: string;
  role: UserRole;
  initials: string;
}

export interface AuthTokens {
  accessToken: string | null;
  refreshToken: string | null;
}

function toSessionUser(role: UserRole): SessionUser {
  const seed = usersSeed.find((u) => u.role === role) ?? usersSeed[0];
  return {
    id: seed.id,
    employeeId: seed.employeeId,
    nameKey: seed.nameKey as SessionUser["nameKey"],
    firstNameKey: seed.firstNameKey as SessionUser["firstNameKey"],
    email: seed.email,
    role: seed.role,
    initials: seed.initials,
  };
}

function fromAppUser(user: AppUser): SessionUser {
  return {
    id: user.id,
    employeeId: user.employeeId,
    nameKey: user.nameKey as SessionUser["nameKey"],
    firstNameKey: user.firstNameKey as SessionUser["firstNameKey"],
    email: user.email,
    role: user.role,
    initials: user.initials,
  };
}

const USERS: Record<UserRole, SessionUser> = {
  admin: toSessionUser("admin"),
  employee: toSessionUser("employee"),
};

interface SessionState {
  role: UserRole;
  user: SessionUser;
  authenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  /** Local demo sign-in (no backend). */
  signIn: (role: UserRole) => void;
  /** Apply backend auth payload (JWT + user). */
  applyAuthSession: (input: {
    user: AppUser | SessionUser;
    role: UserRole;
    accessToken: string;
    refreshToken?: string | null;
  }) => void;
  setRole: (role: UserRole) => void;
  setTokens: (tokens: AuthTokens) => void;
  signOut: () => void;
  isAdmin: () => boolean;
  isEmployee: () => boolean;
}

/**
 * UI + auth session.
 * Local mode: role demo switch.
 * API mode: JWT access/refresh from NestJS auth endpoints.
 */
export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      role: "admin",
      user: USERS.admin,
      authenticated: false,
      accessToken: null,
      refreshToken: null,
      signIn: (role) =>
        set({
          authenticated: true,
          role,
          user: USERS[role],
          // Opaque demo token so Bearer wiring can be exercised in hybrid tests
          accessToken: `demo.${role}.${USERS[role].id}`,
          refreshToken: `demo-refresh.${role}`,
        }),
      applyAuthSession: ({ user, role, accessToken, refreshToken }) =>
        set({
          authenticated: true,
          role,
          user: "email" in user && "nameKey" in user ? fromAppUser(user as AppUser) : (user as SessionUser),
          accessToken,
          refreshToken: refreshToken ?? null,
        }),
      setRole: (role) =>
        set((state) => ({
          role,
          user: USERS[role],
          accessToken: state.accessToken?.startsWith("demo.")
            ? `demo.${role}.${USERS[role].id}`
            : state.accessToken,
          refreshToken: state.refreshToken?.startsWith("demo-refresh.")
            ? `demo-refresh.${role}`
            : state.refreshToken,
        })),
      setTokens: ({ accessToken, refreshToken }) =>
        set({ accessToken, refreshToken }),
      signOut: () =>
        set({
          authenticated: false,
          role: "admin",
          user: USERS.admin,
          accessToken: null,
          refreshToken: null,
        }),
      isAdmin: () => get().role === "admin",
      isEmployee: () => get().role === "employee",
    }),
    {
      name: "rootk-session",
      partialize: (state) => ({
        role: state.role,
        authenticated: state.authenticated,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
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
              >
            >
          | undefined;
        const role = p?.role ?? current.role;
        return {
          ...current,
          role,
          user: p?.user ?? USERS[role],
          authenticated: p?.authenticated ?? false,
          accessToken: p?.accessToken ?? null,
          refreshToken: p?.refreshToken ?? null,
        };
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

/**
 * Employee entity id used in work assignee/participant fields.
 * Local demo: same as `user.id` (e.g. emp-003).
 * API mode: linked `user.employeeId` (User.sub is a separate cuid).
 */
export function getWorkEmployeeIdFromUser(user: Pick<SessionUser, "id" | "employeeId">): string {
  if (isApiMode() && user.employeeId) return user.employeeId;
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
