import type { PrismaService } from "../prisma/prisma.service";

export async function writeActivity(
  prisma: PrismaService,
  input: {
    companyId: string;
    type: string;
    title: string;
    description: string;
    employeeId?: string;
    actorId?: string;
  }
) {
  return prisma.activity.create({
    data: {
      companyId: input.companyId,
      type: input.type,
      title: input.title,
      description: input.description,
      employeeId: input.employeeId,
      timestamp: new Date(),
      createdBy: input.actorId ?? "system",
      updatedBy: input.actorId ?? "system",
    },
  });
}
