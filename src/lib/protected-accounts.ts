/** Canonical system admin — never hard-delete. */
export const SYSTEM_ADMIN_EMPLOYEE_ID = "emp_admin_001";
export const SYSTEM_ADMIN_USER_ID = "usr_admin_001";
export const SYSTEM_ADMIN_EMAIL = "admin@rootk.systems";

export function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

/** True when this employee/account must never be deleted. */
export function isProtectedAdminAccount(input: {
  employeeId?: string | null;
  email?: string | null;
  userRole?: string | null;
}): boolean {
  if (input.employeeId === SYSTEM_ADMIN_EMPLOYEE_ID) return true;
  if (normalizeEmail(input.email) === SYSTEM_ADMIN_EMAIL) return true;
  if (input.userRole === "admin") return true;
  return false;
}
