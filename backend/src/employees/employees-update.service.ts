import { Injectable, NotFoundException } from "@nestjs/common";
import { EmployeeStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { mapEmployee, parseDate } from "../common/mappers";
import { hashPassword } from "../auth/password.util";
import { assertOptionalPassword } from "./employees-validators";

/** Employee update flow, including keeping the linked login account in sync. */
@Injectable()
export class EmployeesUpdateService {
  constructor(private readonly prisma: PrismaService) {}

  async update(
    companyId: string,
    actorId: string,
    id: string,
    body: Record<string, unknown>
  ) {
    const current = await this.prisma.employee.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!current) throw new NotFoundException("Employee not found");

    const password =
      typeof body.password === "string" ? body.password.trim() : undefined;
    assertOptionalPassword(password);

    const nextEmail =
      typeof body.email === "string" ? body.email.trim() : undefined;
    const nextName =
      typeof body.name === "string" ? body.name.trim() : undefined;

    const row = await this.prisma.employee.update({
      where: { id },
      data: {
        name: nextName,
        email: nextEmail,
        department: body.department as string | undefined,
        position: body.position as string | undefined,
        location: body.location as string | undefined,
        phone: body.phone as string | undefined,
        managerName: body.manager as string | undefined,
        employeeCode: body.employeeId as string | undefined,
        joinDate: body.joinDate ? parseDate(String(body.joinDate)) : undefined,
        status: body.status as EmployeeStatus | undefined,
        updatedBy: actorId,
        version: { increment: 1 },
      },
    });

    const linkedUser = await this.prisma.user.findFirst({
      where: {
        companyId,
        employeeId: id,
        deletedAt: null,
      },
    });
    if (linkedUser) {
      const userPatch: Prisma.UserUpdateInput = {
        updatedBy: actorId,
        version: { increment: 1 },
      };
      if (nextEmail) userPatch.email = nextEmail.toLowerCase();
      if (nextName) {
        userPatch.displayName = nextName;
        const initials = nextName
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((p) => p[0]?.toUpperCase() ?? "")
          .join("");
        if (initials) userPatch.initials = initials;
      }
      if (password) {
        userPatch.passwordHash = hashPassword(password);
      }
      await this.prisma.user.update({
        where: { id: linkedUser.id },
        data: userPatch,
      });
      if (password) {
        await this.prisma.refreshToken.updateMany({
          where: { userId: linkedUser.id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
    }

    return mapEmployee(row);
  }

  async updateStatus(
    companyId: string,
    actorId: string,
    id: string,
    status: string
  ) {
    const current = await this.prisma.employee.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!current) throw new NotFoundException("Employee not found");

    const row = await this.prisma.employee.update({
      where: { id },
      data: {
        status: status as EmployeeStatus,
        updatedBy: actorId,
        version: { increment: 1 },
      },
    });
    return mapEmployee(row);
  }
}
