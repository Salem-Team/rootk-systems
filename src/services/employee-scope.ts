import {
  resolveDataAccessScope,
  type PermissionId,
} from "@/constants/permissions";
import { directReportIds } from "@/lib/team";
import { employeeRepository } from "@/repositories";
import {
  getSessionPermissions,
  getSessionRole,
  getWorkEmployeeId,
} from "@/stores/session-store";

/** `null` = whole company. Empty array = nobody. */
export async function localEmployeeIdsForModule(
  viewAll: PermissionId,
  viewTeam: PermissionId
): Promise<string[] | null> {
  const scope = resolveDataAccessScope(
    getSessionPermissions(),
    viewAll,
    viewTeam,
    getSessionRole()
  );
  if (scope === "all") return null;
  const self = getWorkEmployeeId()?.trim();
  if (!self) return [];
  if (scope === "own") return [self];
  const roster = await employeeRepository.list();
  return [self, ...directReportIds(self, roster)];
}

export function employeeInLocalScope(
  employeeId: string | null | undefined,
  allowed: string[] | null
): boolean {
  if (allowed === null) return true;
  const id = employeeId?.trim();
  return Boolean(id && allowed.includes(id));
}

export async function localDirectReportIds(): Promise<string[]> {
  const self = getWorkEmployeeId()?.trim();
  if (!self) return [];
  const roster = await employeeRepository.list();
  return directReportIds(self, roster);
}
