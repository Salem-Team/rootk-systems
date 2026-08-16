import { ForbiddenException } from "@nestjs/common";
import {
  resolveDataAccessScope,
  type DataAccessScope,
  type PermissionId,
} from "./permissions-catalog";
import { listDirectReportIds } from "../lib/team";
import type { PrismaService } from "../prisma/prisma.service";

export type { DataAccessScope };

/** `null` = whole company. Empty array = nobody. */
export async function employeeIdsForScope(
  prisma: PrismaService,
  companyId: string,
  actorEmployeeId: string | undefined,
  scope: DataAccessScope
): Promise<string[] | null> {
  if (scope === "all") return null;
  const self = actorEmployeeId?.trim();
  if (!self) return [];
  if (scope === "own") return [self];
  const reports = await listDirectReportIds(prisma, companyId, self);
  return [self, ...reports];
}

export async function employeeIdsForModule(
  prisma: PrismaService,
  companyId: string,
  actor: { employeeId?: string; role: string; permissions?: string[] },
  viewAll?: PermissionId,
  viewTeam?: PermissionId
): Promise<string[] | null> {
  const scope = resolveDataAccessScope(
    actor.permissions,
    viewAll,
    viewTeam,
    actor.role
  );
  return employeeIdsForScope(prisma, companyId, actor.employeeId, scope);
}

export function assertEmployeeInScope(
  targetEmployeeId: string | null | undefined,
  allowedIds: string[] | null
) {
  if (allowedIds === null) return;
  const id = targetEmployeeId?.trim();
  if (!id || !allowedIds.includes(id)) {
    throw new ForbiddenException(
      "You can only act on people who report directly to you"
    );
  }
}

export function prismaInFilter(
  field: "employeeId" | "ownerEmployeeId",
  allowedIds: string[] | null
): Record<string, string | { in: string[] }> {
  if (allowedIds === null) return {};
  if (allowedIds.length === 0) return { [field]: { in: [] } };
  if (allowedIds.length === 1) return { [field]: allowedIds[0] };
  return { [field]: { in: allowedIds } };
}

export function prismaEmployeeFilter(allowedIds: string[] | null): {
  employeeId?: string | { in: string[] };
} {
  return prismaInFilter("employeeId", allowedIds) as {
    employeeId?: string | { in: string[] };
  };
}

export function prismaOwnerEmployeeFilter(allowedIds: string[] | null): {
  ownerEmployeeId?: string | { in: string[] };
} {
  return prismaInFilter("ownerEmployeeId", allowedIds) as {
    ownerEmployeeId?: string | { in: string[] };
  };
}
