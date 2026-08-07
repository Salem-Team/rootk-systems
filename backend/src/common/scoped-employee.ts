import { ForbiddenException } from "@nestjs/common";
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
    return requireLinkedEmployeeId(user);
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
    return requireLinkedEmployeeId(user);
  }
  return requestedEmployeeId ?? user.employeeId;
}

/**
 * Employee.id used in assigneeIds / performance filters.
 * Never fall back to User.sub — that silently empties employee feeds.
 */
export function requireLinkedEmployeeId(user: JwtPayload): string {
  const id = user.employeeId?.trim();
  if (!id) {
    throw new ForbiddenException(
      "Employee account is not linked to a workforce profile"
    );
  }
  return id;
}

/** Build a domain actor with a real Employee.id for employees. */
export function toDomainActor(user: JwtPayload, actorUserId: string) {
  const role = user.role as "admin" | "employee";
  return {
    userId: actorUserId,
    role,
    employeeId: isEmployeeRole(role)
      ? requireLinkedEmployeeId(user)
      : (user.employeeId?.trim() || actorUserId),
  };
}
