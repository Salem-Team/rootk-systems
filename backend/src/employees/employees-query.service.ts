import { Injectable, NotFoundException } from "@nestjs/common";
import { EmployeeStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { mapEmployee } from "../common/mappers";

/** Read-side employee queries: list/search, lookup, and profile extras. */
@Injectable()
export class EmployeesQueryService {
  constructor(private readonly prisma: PrismaService) {}

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
