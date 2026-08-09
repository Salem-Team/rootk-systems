"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AppRole } from "@/constants/roles";
import { isApiMode } from "@/lib/env";
import {
  resolveAccountFirstName,
  resolveAccountFullName,
} from "@/lib/user-display-name";
import { usersSeed } from "@/mocks/users";
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

function toSessionUser(role: UserRole): SessionUser {
  const seed = usersSeed.find((u) => u.role === role) ?? usersSeed[0];
  const displayName =
    seed.displayName?.trim() ||
    resolveAccountFullName(seed) ||
    seed.email.split("@")[0];
  const firstName =
    seed.firstName?.trim() ||
    resolveAccountFirstName({ ...seed, displayName }) ||
    displayName;
  return {
    id: seed.id,
    employeeId: seed.employeeId,
    displayName,
    firstName,
    lastName: seed.lastName?.trim() || "",
    email: seed.email,
    role: seed.role,
    initials: seed.initials,
    nameKey: seed.nameKey,
    firstNameKey: seed.firstNameKey,
  };
}

function fromAppUser(user: AppUser): SessionUser {
  const displayName =
    user.displayName?.trim() ||
    resolveAccountFullName(user) ||
    user.email.split("@")[0] ||
    user.email;
  const firstName =
    user.firstName?.trim() ||
    resolveAccountFirstName({ ...user, displayName }) ||
    displayName;
  return {
    id: user.id,
    employeeId: user.employeeId,
    displayName,
    firstName,
    lastName: user.lastName?.trim() || "",
    email: user.email,
    role: user.role,
    initials: user.initials,
    nameKey: user.nameKey,
    firstNameKey: user.firstNameKey,
  };
}

const EMPTY_USER: SessionUser = toSessionUser(AppRole.admin);

interface SessionState {
  role: UserRole;
  user: SessionUser;
  authenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  /** Apply auth payload (JWT or local session). */
  applyAuthSession: (input: {
    user: AppUser | SessionUser;
    role: UserRole;
    accessToken: string;
    refreshToken?: string | null;
  }) => void;
  setTokens: (tokens: AuthTokens) => void;
  signOut: () => void;
  isAdmin: () => boolean;
  isEmployee: () => boolean;
}

/**
 * UI + auth session.
 * Role comes only from the authenticated account — no view switching.
 */
export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      role: AppRole.admin,
      user: EMPTY_USER,
      authenticated: false,
      accessToken: null,
      refreshToken: null,
      applyAuthSession: ({ user, role, accessToken, refreshToken }) =>
        set({
          authenticated: true,
          role,
          user: fromAppUser(user as AppUser),
          accessToken,
          refreshToken: refreshToken ?? null,
        }),
      setTokens: ({ accessToken, refreshToken }) =>
        set({ accessToken, refreshToken }),
      signOut: () =>
        set({
          authenticated: false,
          role: AppRole.admin,
          user: EMPTY_USER,
          accessToken: null,
          refreshToken: null,
        }),
      isAdmin: () => get().role === AppRole.admin,
      isEmployee: () => get().role === AppRole.employee,
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
        const rawUser = p?.user;
        const user =
          rawUser && typeof rawUser === "object"
            ? fromAppUser(rawUser as AppUser)
            : current.user;
        return {
          ...current,
          role: p?.role ?? current.role,
          user,
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
