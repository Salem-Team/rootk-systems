import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { mapPos } from "./org-mappers";

/** Job positions CRUD. */
@Injectable()
export class OrgPositionsService {
  constructor(private readonly prisma: PrismaService) {}

  listPositions(companyId: string) {
    return this.prisma.jobPosition
      .findMany({ where: { companyId, deletedAt: null }, orderBy: { title: "asc" } })
      .then((rows) => rows.map(mapPos));
  }

  async upsertPosition(companyId: string, actorId: string, body: Record<string, unknown>) {
    if (body.id) {
      const current = await this.prisma.jobPosition.findFirst({
        where: { id: String(body.id), companyId, deletedAt: null },
      });
      if (!current) throw new NotFoundException("Position not found");
      const row = await this.prisma.jobPosition.update({
        where: { id: String(body.id) },
        data: {
          title: body.title as string | undefined,
          department: body.department as string | undefined,
          grade: body.grade as string | undefined,
          reportsTo: body.reportsTo as string | undefined,
          active: body.active as boolean | undefined,
          updatedBy: actorId,
          version: { increment: 1 },
        },
      });
      return mapPos(row);
    }
    const row = await this.prisma.jobPosition.create({
      data: {
        companyId,
        title: String(body.title ?? ""),
        department: String(body.department ?? ""),
        grade: String(body.grade ?? ""),
        reportsTo: String(body.reportsTo ?? ""),
        active: body.active !== false,
        createdBy: actorId,
        updatedBy: actorId,
      },
    });
    return mapPos(row);
  }

  async deletePosition(companyId: string, actorId: string, id: string) {
    const current = await this.prisma.jobPosition.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!current) throw new NotFoundException("Position not found");
    await this.prisma.jobPosition.update({
      where: { id },
      data: { deletedAt: new Date(), isArchived: true, updatedBy: actorId, version: { increment: 1 } },
    });
    return true;
  }
}
