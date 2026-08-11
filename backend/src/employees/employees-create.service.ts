import { ConflictException, Injectable } from "@nestjs/common";
import { EmployeeStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { mapEmployee, parseDate } from "../common/mappers";
import { NotificationsService } from "../notifications/notifications.service";
import { writeActivity } from "../common/activity-writer";
import { hashPassword } from "../auth/password.util";
import { AppRole } from "../common/roles";
import { requireCreateFields } from "./employees-validators";
import { resolveManagerAssignment } from "./employees-manager";

/** Employee creation flow (employee record + salary profile + login account). */
@Injectable()
export class EmployeesCreateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService
  ) {}

  async create(
    companyId: string,
    actorId: string,
    body: {
      name: string;
      email: string;
      department: string;
      position: string;
      location?: string;
      phone?: string;
      joinDate: string;
      status?: string;
      manager?: string;
      managerEmployeeId?: string;
      employeeId?: string;
      password: string;
    }
  ) {
    requireCreateFields(body);
    const password = body.password.trim();
    const manager = await resolveManagerAssignment(
      this.prisma,
      companyId,
      undefined,
      body
    );
    try {
      const row = await this.prisma.employee.create({
        data: {
          companyId,
          employeeCode:
            body.employeeId ?? `RK-${Date.now().toString().slice(-6)}`,
          name: body.name.trim(),
          email: body.email.trim(),
          department: body.department.trim(),
          position: body.position.trim(),
          location: body.location ?? "",
          phone: body.phone ?? "",
          managerName: manager.managerName,
          managerEmployeeId: manager.managerEmployeeId,
          joinDate: parseDate(body.joinDate),
          status: (body.status as EmployeeStatus) ?? EmployeeStatus.active,
          createdBy: actorId,
          updatedBy: actorId,
        },
      });

      await this.prisma.employeeSalaryProfile.upsert({
        where: {
          companyId_employeeId: { companyId, employeeId: row.id },
        },
        create: {
          companyId,
          employeeId: row.id,
          payload: {
            basicSalary: 15000,
            allowances: {
              housing: 1500,
              transportation: 500,
              meal: 300,
              phone: 200,
              other: 0,
              shift: 0,
            },
            bonuses: 0,
            commission: 0,
            currency: "EGP",
            salaryType: "monthly",
          } as unknown as Prisma.InputJsonValue,
        },
        update: {},
      });

      const existingUser = await this.prisma.user.findFirst({
        where: {
          companyId,
          email: { equals: body.email, mode: "insensitive" },
        },
      });
      if (existingUser && !existingUser.deletedAt) {
        throw new ConflictException(
          "A login account with this email already exists"
        );
      }

      const initials = body.name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() ?? "")
        .join("");

      if (existingUser?.deletedAt) {
        await this.prisma.user.update({
          where: { id: existingUser.id },
          data: {
            employeeId: row.id,
            email: body.email.trim().toLowerCase(),
            role: AppRole.employee,
            initials: initials || "EM",
            displayName: body.name.trim(),
            passwordHash: hashPassword(password),
            isActive: true,
            deletedAt: null,
            isArchived: false,
            updatedBy: actorId,
            version: { increment: 1 },
            metadata: {
              nameKey: "user.employeeFullName",
              firstNameKey: "user.employeeFirstName",
            },
          },
        });
      } else {
        const createdUser = await this.prisma.user.create({
          data: {
            companyId,
            employeeId: row.id,
            email: body.email.trim().toLowerCase(),
            role: AppRole.employee,
            initials: initials || "EM",
            displayName: body.name.trim(),
            passwordHash: hashPassword(password),
            isActive: true,
            createdBy: actorId,
            updatedBy: actorId,
            metadata: {
              nameKey: "user.employeeFullName",
              firstNameKey: "user.employeeFirstName",
            },
          },
        });
        await this.prisma.userPreferences.create({
          data: {
            companyId,
            userId: createdUser.id,
            language: "ar",
            appearance: "system",
            notifications: {
              email: true,
              push: true,
              sound: true,
              attendanceReminders: true,
              leaveUpdates: true,
              announcements: true,
              system: true,
              work: true,
              payroll: true,
              schedule: true,
              mention: true,
            } as unknown as Prisma.InputJsonValue,
            createdBy: actorId,
            updatedBy: actorId,
          },
        });
      }

      await this.notifications.notifyDomain({
        companyId,
        actorId,
        category: "system",
        priority: "normal",
        audience: "admin",
        titleKey: "notifications.employeeCreatedTitle",
        bodyKey: "notifications.employeeCreatedBody",
        vars: { name: row.name },
        href: "/employees",
        entityType: "employee",
        entityId: row.id,
      });
      await writeActivity(this.prisma, {
        companyId,
        type: "announcement",
        title: "Employee created",
        description: `${row.name} joined ${row.department}`,
        employeeId: row.id,
        actorId,
      });

      return mapEmployee(row);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        throw new ConflictException("Employee email or code already exists");
      }
      throw e;
    }
  }
}
