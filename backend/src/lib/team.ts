import { ForbiddenException } from "@nestjs/common";
import { AppRole } from "../common/roles";
import type { PrismaService } from "../prisma/prisma.service";

export async function listDirectReportIds(
  prisma: PrismaService,
  companyId: string,
  managerEmployeeId: string
): Promise<string[]> {
  if (!managerEmployeeId) return [];
  const rows = await prisma.employee.findMany({
    where: {
      companyId,
      deletedAt: null,
      managerEmployeeId,
    },
    select: { id: true },
  });
  return rows.map((row) => row.id);
}

export async function assertCanAssignToTeam(
  prisma: PrismaService,
  companyId: string,
  actor: { role: string; employeeId: string },
  assigneeIds: string[]
) {
  if (actor.role === AppRole.admin) return;
  if (!actor.employeeId || assigneeIds.length === 0) {
    throw new ForbiddenException("You can only assign work to your team");
  }
  const allowed = new Set(
    await listDirectReportIds(prisma, companyId, actor.employeeId)
  );
  if (assigneeIds.some((id) => !allowed.has(id))) {
    throw new ForbiddenException("You can only assign work to your team");
  }
}
