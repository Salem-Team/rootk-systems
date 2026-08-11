"use client";

import {
  COMPANY_ADMIN_PERMISSIONS,
  hasAnyPermissionId,
  hasPermissionId,
  type PermissionId,
} from "@/constants/permissions";
import { getSessionPermissions, useSessionStore } from "@/stores/session-store";

export function usePermissions(): PermissionId[] {
  return useSessionStore((s) => (s.authenticated ? s.permissions : []));
}

export function useHasPermission(id: PermissionId): boolean {
  const authenticated = useSessionStore((s) => s.authenticated);
  const permissions = useSessionStore((s) => s.permissions);
  const role = useSessionStore((s) => s.role);
  if (!authenticated) return false;
  return hasPermissionId(id, permissions, role);
}

export function useHasAnyPermission(ids: readonly PermissionId[]): boolean {
  const authenticated = useSessionStore((s) => s.authenticated);
  const permissions = useSessionStore((s) => s.permissions);
  const role = useSessionStore((s) => s.role);
  if (!authenticated) return false;
  return hasAnyPermissionId(ids, permissions, role);
}

export function useCanManageCompanySettings(): boolean {
  return useHasAnyPermission(COMPANY_ADMIN_PERMISSIONS);
}

export function can(id: PermissionId): boolean {
  const state = useSessionStore.getState();
  return hasPermissionId(id, getSessionPermissions(), state.role);
}
