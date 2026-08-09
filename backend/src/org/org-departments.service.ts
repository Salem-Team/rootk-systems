import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { mapDept } from "./org-mappers";

/** Departments CRUD, keeping employees/positions in sync on rename. */
@Injectable()
export class OrgDepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  listDepartments(companyId: string) {
    return this.prisma.department
      .findMany({
        where: { companyId, deletedAt: null },
        orderBy: { name: "asc" },
      })
      .then((rows) => rows.map(mapDept));
  }

  async upsertDepartment(
    companyId: string,
    actorId: string,
    body: Record<string, unknown>
  ) {
    const name = String(body.name ?? "").trim();
    if (!name) {
      throw new BadRequestException("Department name is required");
    }

    if (body.id) {
      const current = await this.prisma.department.findFirst({
        where: { id: String(body.id), companyId, deletedAt: null },
      });
      if (!current) throw new NotFoundException("Department not found");

      const nameTaken = await this.prisma.department.findFirst({
        where: {
          companyId,
          deletedAt: null,
          name: { equals: name, mode: "insensitive" },
          NOT: { id: current.id },
        },
      });
      if (nameTaken) {
        throw new ConflictException("A department with this name already exists");
      }

      const row = await this.prisma.department.update({
        where: { id: current.id },
        data: {
          name,
          nameAr:
            body.nameAr === undefined
              ? undefined
              : String(body.nameAr ?? "").trim() || null,
          code:
            body.code === undefined
              ? undefined
              : String(body.code ?? "").trim() || null,
          color: body.color ? String(body.color) : undefined,
          active: body.active as boolean | undefined,
          updatedBy: actorId,
          version: { increment: 1 },
        },
      });

      if (current.name !== name) {
        await this.prisma.employee.updateMany({
          where: { companyId, department: current.name, deletedAt: null },
          data: { department: name, updatedBy: actorId },
        });
        await this.prisma.jobPosition.updateMany({
          where: { companyId, department: current.name, deletedAt: null },
          data: { department: name, updatedBy: actorId },
        });
      }

      return mapDept(row);
    }

    const existing = await this.prisma.department.findFirst({
      where: {
        companyId,
        deletedAt: null,
        name: { equals: name, mode: "insensitive" },
      },
    });
    if (existing) {
      throw new ConflictException("A department with this name already exists");
    }

    const row = await this.prisma.department.create({
      data: {
        companyId,
        name,
        nameAr: String(body.nameAr ?? "").trim() || null,
        code: String(body.code ?? "").trim() || null,
        color: String(body.color ?? "#082868"),
        active: body.active !== false,
        createdBy: actorId,
        updatedBy: actorId,
      },
    });
    return mapDept(row);
  }

  async deleteDepartment(companyId: string, actorId: string, id: string) {
    const current = await this.prisma.department.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!current) throw new NotFoundException("Department not found");

    const inUse = await this.prisma.employee.count({
      where: {
        companyId,
        department: current.name,
        deletedAt: null,
      },
    });
    if (inUse > 0) {
      throw new BadRequestException(
        "Cannot delete a department that still has employees. Reassign them first."
      );
    }

    await this.prisma.department.delete({ where: { id } });
    return true;
  }
}
