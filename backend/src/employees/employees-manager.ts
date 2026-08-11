import { BadRequestException } from "@nestjs/common";
import type { PrismaService } from "../prisma/prisma.service";

export async function resolveManagerAssignment(
  prisma: PrismaService,
  companyId: string,
  selfId: string | undefined,
  body: { managerEmployeeId?: unknown; manager?: unknown }
): Promise<{ managerEmployeeId: string | null; managerName: string | null }> {
  const rawId =
    typeof body.managerEmployeeId === "string"
      ? body.managerEmployeeId.trim()
      : "";
  const rawName =
    typeof body.manager === "string" ? body.manager.trim() : "";

  if (!rawId && !rawName) {
    return { managerEmployeeId: null, managerName: null };
  }

  const manager = await prisma.employee.findFirst({
    where: {
      companyId,
      deletedAt: null,
      ...(rawId ? { id: rawId } : { name: rawName }),
    },
  });
  if (!manager) throw new BadRequestException("Manager not found");
  if (selfId && manager.id === selfId) {
    throw new BadRequestException("An employee cannot be their own manager");
  }
  return { managerEmployeeId: manager.id, managerName: manager.name };
}
