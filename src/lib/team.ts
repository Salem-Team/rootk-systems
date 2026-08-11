import type { Employee } from "@/types";

type ManagerLink = Pick<Employee, "id" | "name"> & {
  manager?: string;
  managerEmployeeId?: string;
};

export function managerIdOf(employee: ManagerLink): string {
  return employee.managerEmployeeId?.trim() || "";
}

export function findManager(
  employee: ManagerLink,
  roster: ManagerLink[]
): ManagerLink | null {
  const id = managerIdOf(employee);
  if (id) return roster.find((e) => e.id === id) ?? null;
  if (!employee.manager) return null;
  return roster.find((e) => e.name === employee.manager) ?? null;
}

export function findDirectReports<T extends ManagerLink>(
  managerId: string,
  roster: T[]
): T[] {
  if (!managerId) return [];
  const manager = roster.find((e) => e.id === managerId);
  return roster.filter((e) => {
    if (e.id === managerId) return false;
    if (managerIdOf(e) === managerId) return true;
    return Boolean(manager && e.manager && e.manager === manager.name);
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
