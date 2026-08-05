import type { JwtPayload } from "./decorators/current-user";
import { isEmployeeRole } from "./roles";

/**
 * Employees may only see/act on their own employeeId.
 * Admins keep the optional query/body override.
 */
export function resolveScopedEmployeeId(
  user: JwtPayload,
  requestedEmployeeId?: string
): string | undefined {
  if (isEmployeeRole(user.role)) {
    return user.employeeId;
  }
  return requestedEmployeeId ?? undefined;
}

/**
 * Force an employee actor to their linked employeeId (check-in/out, leave create).
 */
export function resolveActorEmployeeId(
  user: JwtPayload,
  requestedEmployeeId?: string
): string | undefined {
  if (isEmployeeRole(user.role)) {
    return user.employeeId;
  }
  return requestedEmployeeId ?? user.employeeId;
}
