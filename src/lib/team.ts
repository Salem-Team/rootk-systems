import type { Employee } from "@/types";

export type ManagerLink = Pick<Employee, "id" | "name"> & {
  manager?: string;
  managerEmployeeId?: string;
  managerEmployeeIds?: string[];
};

export function managerIdsOf(employee: ManagerLink): string[] {
  const fromArray = (employee.managerEmployeeIds ?? [])
    .map((id) => id.trim())
    .filter(Boolean);
  if (fromArray.length > 0) return [...new Set(fromArray)];
  const legacy = employee.managerEmployeeId?.trim();
  return legacy ? [legacy] : [];
}

export function managerIdOf(employee: ManagerLink): string {
  return managerIdsOf(employee)[0] ?? "";
}

export function findManagers<T extends ManagerLink>(
  employee: ManagerLink,
  roster: T[]
): T[] {
  const ids = managerIdsOf(employee);
  if (ids.length > 0) {
    const byId = new Map(roster.map((row) => [row.id, row]));
    return ids
      .map((id) => byId.get(id))
      .filter((row): row is T => Boolean(row));
  }
  const names = (employee.manager ?? "")
    .split("·")
    .map((part) => part.trim())
    .filter(Boolean);
  if (names.length === 0) return [];
  return roster.filter((row) => names.includes(row.name));
}

export function findManager(
  employee: ManagerLink,
  roster: ManagerLink[]
): ManagerLink | null {
  return findManagers(employee, roster)[0] ?? null;
}

export function findDirectReports<T extends ManagerLink>(
  managerId: string,
  roster: T[]
): T[] {
  if (!managerId) return [];
  const manager = roster.find((e) => e.id === managerId);
  return roster.filter((e) => {
    if (e.id === managerId) return false;
    if (managerIdsOf(e).includes(managerId)) return true;
    if (!manager?.name || !e.manager) return false;
    return e.manager
      .split("·")
      .map((part) => part.trim())
      .includes(manager.name);
  });
}

export function directReportIds(managerId: string, roster: ManagerLink[]): string[] {
  return findDirectReports(managerId, roster).map((e) => e.id);
}

export function isDirectReportOf(
  managerId: string,
  employeeId: string,
  roster: ManagerLink[]
): boolean {
  return directReportIds(managerId, roster).includes(employeeId);
}

export function canAssignToTeam(
  actor: { role: string; employeeId: string },
  assigneeIds: string[],
  roster: ManagerLink[]
): boolean {
  if (actor.role === "admin") return true;
  if (!actor.employeeId || assigneeIds.length === 0) return false;
  const allowed = new Set(directReportIds(actor.employeeId, roster));
  return assigneeIds.every((id) => allowed.has(id));
}

export function sameIdSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((id) => set.has(id));
}
