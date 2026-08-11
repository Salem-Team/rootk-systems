import { BadRequestException } from "@nestjs/common";
import type { PrismaService } from "../prisma/prisma.service";

const MAX_DIRECT_MANAGERS = 12;

function uniqueIds(values: string[]): string[] {
  return [...new Set(values.map((id) => id.trim()).filter(Boolean))];
}

function parseIdList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  return uniqueIds(
    value.filter((item): item is string => typeof item === "string")
  );
}

export async function resolveManagerAssignment(
  prisma: PrismaService,
  companyId: string,
  selfId: string | undefined,
  body: {
    managerEmployeeIds?: unknown;
    managerEmployeeId?: unknown;
    manager?: unknown;
  }
): Promise<{ managerEmployeeIds: string[]; managerName: string | null }> {
  const fromArray = parseIdList(body.managerEmployeeIds);
  const rawId =
    typeof body.managerEmployeeId === "string"
      ? body.managerEmployeeId.trim()
      : "";
  const rawName =
    typeof body.manager === "string" ? body.manager.trim() : "";

  let ids = fromArray ?? (rawId ? [rawId] : []);

  if (ids.length === 0 && rawName && fromArray == null) {
    const names = uniqueIds(rawName.split("·").map((part) => part.trim()));
    if (names.length > 0) {
      const matches = await prisma.employee.findMany({
        where: { companyId, deletedAt: null, name: { in: names } },
        select: { id: true, name: true },
      });
      const byName = new Map(matches.map((row) => [row.name, row.id]));
      ids = uniqueIds(names.map((name) => byName.get(name) ?? ""));
      if (ids.length !== names.length) {
        throw new BadRequestException("Manager not found");
      }
    }
  }

  if (ids.length > MAX_DIRECT_MANAGERS) {
    throw new BadRequestException("Too many direct managers");
  }
  if (selfId && ids.includes(selfId)) {
    throw new BadRequestException("An employee cannot be their own manager");
  }
  if (ids.length === 0) {
    return { managerEmployeeIds: [], managerName: null };
  }

  const managers = await prisma.employee.findMany({
    where: { companyId, deletedAt: null, id: { in: ids } },
    select: { id: true, name: true },
  });
  if (managers.length !== ids.length) {
    throw new BadRequestException("Manager not found");
  }
  const nameById = new Map(managers.map((row) => [row.id, row.name]));
  const names = ids.map((id) => nameById.get(id) ?? "").filter(Boolean);
  return {
    managerEmployeeIds: ids,
    managerName: names.join(" · ") || null,
  };
}
