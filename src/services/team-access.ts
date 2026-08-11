import { AppRole } from "@/constants/roles";
import { ForbiddenError } from "@/lib/errors";
import { canAssignToTeam, directReportIds } from "@/lib/team";
import { employeeRepository } from "@/repositories";
import { actorContext } from "@/services/work/work-shared";

export async function assertEmployeeCanAssignToTeam(assigneeIds: string[]) {
  const { role, employeeId } = actorContext();
  if (role === AppRole.admin) return;
  const roster = await employeeRepository.list();
  if (!canAssignToTeam({ role, employeeId }, assigneeIds, roster)) {
    throw new ForbiddenError("You can only assign work to your team");
  }
}

export async function listLocalDirectReportIds(managerId: string): Promise<string[]> {
  const roster = await employeeRepository.list();
  return directReportIds(managerId, roster);
}
