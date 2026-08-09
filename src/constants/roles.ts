import type { UserRole } from "@/types";

/** Canonical app roles — mirrors backend/src/common/roles.ts. Prefer over string literals. */
export const AppRole = {
  admin: "admin",
  employee: "employee",
} as const satisfies Record<UserRole, UserRole>;

export type AppRoleName = (typeof AppRole)[keyof typeof AppRole];

export function isAdminRole(role: string | undefined | null): boolean {
  return role === AppRole.admin;
}

export function isEmployeeRole(role: string | undefined | null): boolean {
  return role === AppRole.employee;
}
