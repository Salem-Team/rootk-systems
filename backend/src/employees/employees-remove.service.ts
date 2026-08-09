import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { isProtectedAdminAccount } from "../common/protected-accounts";

/** Employee hard-delete flow, with protected-account and self-delete guards. */
@Injectable()
export class EmployeesRemoveService {
  constructor(private readonly prisma: PrismaService) {}

  async remove(companyId: string, actorId: string, id: string) {
    const current = await this.prisma.employee.findFirst({
      where: { id, companyId },
    });
    if (!current) throw new NotFoundException("Employee not found");

    const linkedUsers = await this.prisma.user.findMany({
      where: { companyId, employeeId: id },
      select: { id: true, role: true, email: true },
    });

    const linkedProtected = linkedUsers.some((u) =>
      isProtectedAdminAccount({
        employeeId: id,
        userId: u.id,
        email: u.email,
      })
    );
    if (
      linkedProtected ||
      isProtectedAdminAccount({
        employeeId: current.id,
        email: current.email,
      })
    ) {
      throw new ForbiddenException(
        "The system admin account cannot be deleted"
      );
    }

    const actor = await this.prisma.user.findFirst({
      where: { id: actorId, companyId },
      select: { employeeId: true, email: true },
    });
    if (
      actor?.employeeId === id ||
      (actor?.email &&
        actor.email.trim().toLowerCase() ===
          current.email.trim().toLowerCase())
    ) {
      throw new ForbiddenException("You cannot delete your own account");
    }

    await this.prisma.$transaction(async (tx) => {
      const userIds = linkedUsers.map((u) => u.id);

      if (userIds.length) {
        await tx.refreshToken.deleteMany({
          where: { userId: { in: userIds } },
        });
        await tx.userPreferences.deleteMany({
          where: { userId: { in: userIds } },
        });
        await tx.user.deleteMany({
          where: { id: { in: userIds } },
        });
      }

      await tx.employeeSalaryProfile.deleteMany({
        where: { companyId, employeeId: id },
      });

      // Keep historical attendance/leave/work rows (string refs, no FK),
      // but remove the employee + login account permanently.
      await tx.employee.delete({ where: { id } });
    });

    return true;
  }
}
