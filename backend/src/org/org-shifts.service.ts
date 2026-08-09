import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { mapShift } from "./org-mappers";

/** Shift definitions CRUD. */
@Injectable()
export class OrgShiftsService {
  constructor(private readonly prisma: PrismaService) {}

  listShifts(companyId: string) {
    return this.prisma.shiftDefinition
      .findMany({ where: { companyId, deletedAt: null }, orderBy: { start: "asc" } })
      .then((rows) => rows.map(mapShift));
  }

  async upsertShift(companyId: string, actorId: string, body: Record<string, unknown>) {
    if (body.id) {
      const current = await this.prisma.shiftDefinition.findFirst({
        where: { id: String(body.id), companyId, deletedAt: null },
      });
      if (!current) throw new NotFoundException("Shift not found");
      const row = await this.prisma.shiftDefinition.update({
        where: { id: String(body.id) },
        data: {
          name: body.name as string | undefined,
          nameKey: body.nameKey as string | undefined,
          type: body.type as string | undefined,
          start: body.start as string | undefined,
          end: body.end as string | undefined,
          color: body.color as string | undefined,
          active: body.active as boolean | undefined,
          updatedBy: actorId,
          version: { increment: 1 },
        },
      });
      return mapShift(row);
    }
    const row = await this.prisma.shiftDefinition.create({
      data: {
        companyId,
        name: String(body.name ?? ""),
        nameKey: (body.nameKey as string) ?? undefined,
        type: String(body.type ?? "standard"),
        start: String(body.start ?? "09:00"),
        end: String(body.end ?? "17:00"),
        color: String(body.color ?? "#2563eb"),
        active: body.active !== false,
        createdBy: actorId,
        updatedBy: actorId,
      },
    });
    return mapShift(row);
  }

  async deleteShift(companyId: string, actorId: string, id: string) {
    const current = await this.prisma.shiftDefinition.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!current) throw new NotFoundException("Shift not found");
    await this.prisma.shiftDefinition.update({
      where: { id },
      data: { deletedAt: new Date(), isArchived: true, updatedBy: actorId, version: { increment: 1 } },
    });
    return true;
  }
}
