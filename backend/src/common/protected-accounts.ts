/** Canonical system admin — never hard-delete. */
export const SYSTEM_ADMIN_EMPLOYEE_ID = "emp_admin_001";
export const SYSTEM_ADMIN_USER_ID = "usr_admin_001";
export const SYSTEM_ADMIN_EMAIL = "admin@rootk.systems";

/** Prod historically stored the admin without the `.` in the domain. */
export const SYSTEM_ADMIN_EMAIL_ALIASES = [
  SYSTEM_ADMIN_EMAIL,
  "admin@rootksystems.com",
] as const;

export function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

export function isSystemAdminEmail(email: string | null | undefined): boolean {
  const normalized = normalizeEmail(email);
  return SYSTEM_ADMIN_EMAIL_ALIASES.includes(
    normalized as (typeof SYSTEM_ADMIN_EMAIL_ALIASES)[number]
  );
}

/** Emails to try when looking up the system admin (canonical + aliases). */
export function resolveLoginEmails(email: string): string[] {
  const normalized = normalizeEmail(email);
  if (!normalized) return [];
  if (isSystemAdminEmail(normalized)) {
    return [...SYSTEM_ADMIN_EMAIL_ALIASES];
  }
  return [normalized];
}

/**
 * True when this employee/account must never be deleted.
 * Only the canonical system admin is protected — other admin-role
 * employees remain deletable by a signed-in admin.
 */
export function isProtectedAdminAccount(input: {
  employeeId?: string | null;
  userId?: string | null;
  email?: string | null;
}): boolean {
  if (input.employeeId === SYSTEM_ADMIN_EMPLOYEE_ID) return true;
  if (input.userId === SYSTEM_ADMIN_USER_ID) return true;
  if (isSystemAdminEmail(input.email)) return true;
  return false;
}
