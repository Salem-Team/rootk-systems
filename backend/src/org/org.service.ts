import { BadRequestException, Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import type {
  ApprovalRule,
  Department,
  JobPosition,
  OfficeLocation,
  ShiftDefinition,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { auditFields } from "../common/mappers";
import { resolveGoogleMapsUrl } from "../lib/geo";

function mapLoc(row: OfficeLocation) {
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    address: row.address,
    timezone: row.timezone,
    capacity: row.capacity,
    workingDays: row.workingDays,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    radiusMeters: row.radiusMeters,
    active: row.active,
    ...auditFields(row),
  };
}

function mapDept(row: Department) {
  return {
    id: row.id,
    name: row.name,
    nameAr: row.nameAr ?? undefined,
    code: row.code ?? undefined,
    color: row.color,
    active: row.active,
    ...auditFields(row),
  };
}

function mapPos(row: JobPosition) {
  return {
    id: row.id,
    title: row.title,
    department: row.department,
    grade: row.grade,
    reportsTo: row.reportsTo,
    active: row.active,
    ...auditFields(row),
  };
}

function mapShift(row: ShiftDefinition) {
  return {
    id: row.id,
    name: row.name,
    nameKey: row.nameKey ?? undefined,
    type: row.type,
    start: row.start,
    end: row.end,
    color: row.color,
    active: row.active,
    ...auditFields(row),
  };
}

function mapApproval(row: ApprovalRule) {
  return {
    id: row.id,
    labelKey: row.labelKey,
    requiresApproval: row.requiresApproval,
    approver: row.approver,
    ...auditFields(row),
  };
}

@Injectable()
export class OrgService {
  constructor(private readonly prisma: PrismaService) {}

  listLocations(companyId: string) {
    return this.prisma.officeLocation
      .findMany({ where: { companyId, deletedAt: null }, orderBy: { name: "asc" } })
      .then((rows) => rows.map(mapLoc));
  }

  async resolveMapsUrl(url: string) {
    const trimmed = String(url ?? "").trim();
    if (!trimmed) {
      throw new BadRequestException("Google Maps URL required");
    }
    const point = await resolveGoogleMapsUrl(trimmed);
    if (!point) {
      throw new BadRequestException(
        "Could not extract coordinates from Google Maps URL"
      );
    }
    return point;
  }

  async upsertLocation(companyId: string, actorId: string, body: Record<string, unknown>) {
    if (body.id) {
      const current = await this.prisma.officeLocation.findFirst({
        where: { id: String(body.id), companyId, deletedAt: null },
      });
      if (!current) throw new NotFoundException("Location not found");
      const row = await this.prisma.officeLocation.update({
        where: { id: String(body.id) },
        data: {
          name: body.name as string | undefined,
          city: body.city as string | undefined,
          address: body.address as string | undefined,
          timezone: body.timezone as string | undefined,
          capacity: body.capacity !== undefined ? Number(body.capacity) : undefined,
          workingDays: body.workingDays as string | undefined,
          latitude:
            body.latitude !== undefined && body.latitude !== null && body.latitude !== ""
              ? Number(body.latitude)
              : body.latitude === null
                ? null
                : undefined,
          longitude:
            body.longitude !== undefined &&
            body.longitude !== null &&
            body.longitude !== ""
              ? Number(body.longitude)
              : body.longitude === null
                ? null
                : undefined,
          radiusMeters:
            body.radiusMeters !== undefined
              ? Number(body.radiusMeters)
              : undefined,
          active: body.active as boolean | undefined,
          updatedBy: actorId,
          version: { increment: 1 },
        },
      });
      return mapLoc(row);
    }
    const row = await this.prisma.officeLocation.create({
      data: {
        companyId,
        name: String(body.name ?? ""),
        city: String(body.city ?? ""),
        address: String(body.address ?? ""),
        timezone: String(body.timezone ?? "Africa/Cairo"),
        capacity: Number(body.capacity ?? 20),
        workingDays: String(body.workingDays ?? "Sun-Thu"),
        latitude:
          body.latitude !== undefined && body.latitude !== null && body.latitude !== ""
            ? Number(body.latitude)
            : null,
        longitude:
          body.longitude !== undefined &&
          body.longitude !== null &&
          body.longitude !== ""
            ? Number(body.longitude)
            : null,
        radiusMeters: Number(body.radiusMeters ?? 200),
        active: body.active !== false,
        createdBy: actorId,
        updatedBy: actorId,
      },
    });
    return mapLoc(row);
  }

  async deleteLocation(companyId: string, actorId: string, id: string) {
    const current = await this.prisma.officeLocation.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!current) throw new NotFoundException("Location not found");
    await this.prisma.officeLocation.update({
      where: { id },
      data: { deletedAt: new Date(), isArchived: true, updatedBy: actorId, version: { increment: 1 } },
    });
    return true;
  }

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

  async listApprovals(companyId: string) {
    let rows = await this.prisma.approvalRule.findMany({
      where: { companyId, deletedAt: null },
    });

    const defaults = [
      {
        labelKey: "admin.approvalAttendance",
        requiresApproval: false,
        approver: "manager",
      },
      {
        labelKey: "admin.approvalLeave",
        requiresApproval: true,
        approver: "hr",
      },
      {
        labelKey: "admin.approvalWfh",
        requiresApproval: true,
        approver: "manager",
      },
      {
        labelKey: "admin.approvalOvertime",
        requiresApproval: true,
        approver: "hr",
      },
    ] as const;

    const existingKeys = new Set(rows.map((r) => r.labelKey));
    const missing = defaults.filter((d) => !existingKeys.has(d.labelKey));
    if (missing.length > 0) {
      await this.prisma.approvalRule.createMany({
        data: missing.map((d) => ({
          companyId,
          labelKey: d.labelKey,
          requiresApproval: d.requiresApproval,
          approver: d.approver,
          createdBy: "system",
          updatedBy: "system",
        })),
      });
      rows = await this.prisma.approvalRule.findMany({
        where: { companyId, deletedAt: null },
      });
    }

    if (rows.length === 0) {
      await this.prisma.approvalRule.createMany({
        data: defaults.map((d) => ({
          companyId,
          labelKey: d.labelKey,
          requiresApproval: d.requiresApproval,
          approver: d.approver,
          createdBy: "system",
          updatedBy: "system",
        })),
      });
      rows = await this.prisma.approvalRule.findMany({
        where: { companyId, deletedAt: null },
      });
    }

    return rows.map(mapApproval);
  }

  async patchApproval(companyId: string, actorId: string, id: string, requiresApproval: boolean) {
    const current = await this.prisma.approvalRule.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!current) throw new NotFoundException("Approval rule not found");
    await this.prisma.approvalRule.update({
      where: { id },
      data: { requiresApproval, updatedBy: actorId, version: { increment: 1 } },
    });
    return this.listApprovals(companyId);
  }
}
