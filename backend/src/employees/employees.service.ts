import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { EmployeeStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { mapEmployee, parseDate } from "../common/mappers";
import { NotificationsService } from "../notifications/notifications.service";
import { writeActivity } from "../common/activity-writer";
import { hashPassword } from "../auth/password.util";
import { AppRole } from "../common/roles";
import { isProtectedAdminAccount } from "../common/protected-accounts";

function requireCreateFields(body: {
  name?: string;
  email?: string;
  department?: string;
  position?: string;
  joinDate?: string;
  password?: string;
}) {
  const missing: string[] = [];
  if (!body.name?.trim()) missing.push("name");
  if (!body.email?.trim()) missing.push("email");
  if (!body.department?.trim()) missing.push("department");
  if (!body.position?.trim()) missing.push("position");
  if (!body.joinDate?.trim()) missing.push("joinDate");
  if (!body.password?.trim()) missing.push("password");
  if (missing.length) {
    throw new BadRequestException(
      `Missing required fields: ${missing.join(", ")}`
    );
  }
  if ((body.password?.trim().length ?? 0) < 6) {
    throw new BadRequestException("Password must be at least 6 characters");
  }
}

function assertOptionalPassword(password?: string) {
  if (password === undefined || password === null || password === "") return;
  if (password.trim().length < 6) {
    throw new BadRequestException("Password must be at least 6 characters");
  }
}

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService
  ) {}

  async list(
    companyId: string,
    filters: {
      query?: string;
      department?: string;
      status?: string;
      location?: string;
    } = {}
  ) {
    const where: Prisma.EmployeeWhereInput = {
      companyId,
      deletedAt: null,
    };
    if (filters.department) where.department = filters.department;
    if (filters.status) where.status = filters.status as EmployeeStatus;
    if (filters.location) {
      where.location = { contains: filters.location, mode: "insensitive" };
    }
    if (filters.query) {
      const q = filters.query;
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { employeeCode: { contains: q, mode: "insensitive" } },
        { position: { contains: q, mode: "insensitive" } },
      ];
    }

    const rows = await this.prisma.employee.findMany({
      where,
      orderBy: { name: "asc" },
    });
    return rows.map(mapEmployee);
  }

  async byId(companyId: string, id: string) {
    const row = await this.prisma.employee.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    return row ? mapEmployee(row) : null;
  }

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
      employeeId?: string;
      password: string;
    }
  ) {
    requireCreateFields(body);
    const password = body.password.trim();
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
          managerName: body.manager,
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
        joinDate: body.joinDate
          ? parseDate(String(body.joinDate))
          : undefined,
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

  async remove(companyId: string, _actorId: string, id: string) {
    const current = await this.prisma.employee.findFirst({
      where: { id, companyId },
    });
    if (!current) throw new NotFoundException("Employee not found");

    const linkedUsers = await this.prisma.user.findMany({
      where: { companyId, employeeId: id },
      select: { id: true, role: true },
    });
    const adminLinked = linkedUsers.some((u) => u.role === AppRole.admin);
    if (
      isProtectedAdminAccount({
        employeeId: current.id,
        email: current.email,
        userRole: adminLinked ? AppRole.admin : null,
      })
    ) {
      throw new ForbiddenException(
        "The system admin account cannot be deleted"
      );
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

  async profileExtras(companyId: string, id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!employee) throw new NotFoundException("Employee not found");

    const attendance = await this.prisma.attendanceRecord.findMany({
      where: { companyId, employeeId: id, deletedAt: null },
      orderBy: { date: "desc" },
      take: 60,
    });
    const leaves = await this.prisma.leaveRequest.findMany({
      where: { companyId, employeeId: id, deletedAt: null },
      orderBy: { submittedAt: "desc" },
      take: 10,
    });

    const presentDays = attendance.filter((a) =>
      ["present", "wfh", "late"].includes(a.status)
    ).length;
    const lateDays = attendance.filter((a) => a.isLate).length;
    const absentDays = attendance.filter((a) => a.status === "absent").length;
    const workingHours = Math.round(
      attendance.reduce((s, a) => s + a.workingMinutes, 0) / 60
    );
    const attendanceRate =
      attendance.length === 0
        ? 0
        : Math.round(
            ((presentDays + lateDays * 0.5) /
              Math.max(presentDays + lateDays + absentDays, 1)) *
              1000
          ) / 10;

    const approved = leaves.filter((l) => l.status === "approved").length;
    const pending = leaves.filter((l) => l.status === "pending").length;

    return {
      employmentType:
        employee.status === "inactive" ? "contract" : "full_time",
      workMode: employee.location === "Remote" ? "remote" : "office",
      emergencyContact: {
        name: "—",
        relation: "other",
        phone: employee.phone ?? "",
      },
      performance: {
        score: 4.0,
        labelKey: "employees.perfMeets",
        period: "Q2 2026",
      },
      attendance: {
        presentDays,
        lateDays,
        absentDays,
        workingHours,
        averageArrival: "09:00",
        attendanceRate,
      },
      leave: {
        remaining: Math.max(0, 21 - approved),
        approved,
        pending,
        recent: leaves.slice(0, 5).map((l) => ({
          id: l.id,
          typeKey: `leaveTypes.${l.type}`,
          startDate: l.startDate.toISOString().slice(0, 10),
          endDate: l.endDate.toISOString().slice(0, 10),
          days: l.days,
          status: l.status,
        })),
      },
      activity: [],
    };
  }
}
