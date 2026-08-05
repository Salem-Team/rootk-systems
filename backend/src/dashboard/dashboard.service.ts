import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { auditFields, iso } from "../common/mappers";

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async stats(companyId: string) {
    const today = new Date();
    const day = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const [totalEmployees, attendance, pendingLeave] = await Promise.all([
      this.prisma.employee.count({ where: { companyId, deletedAt: null, status: "active" } }),
      this.prisma.attendanceRecord.findMany({ where: { companyId, date: day, deletedAt: null } }),
      this.prisma.leaveRequest.count({ where: { companyId, status: "pending", deletedAt: null } }),
    ]);
    const present = attendance.filter((a) => a.status === "present").length;
    const late = attendance.filter((a) => a.isLate || a.status === "late").length;
    const wfh = attendance.filter((a) => a.status === "wfh").length;
    const absent = Math.max(0, totalEmployees - present - late - wfh);
    const attendanceRate =
      totalEmployees === 0
        ? 0
        : Math.round(((present + late + wfh) / totalEmployees) * 1000) / 10;
    return {
      present,
      absent,
      late,
      wfh,
      onLeave: pendingLeave,
      attendanceRate,
      totalEmployees,
    };
  }

  async summary(companyId: string) {
    const [stats, weekly, monthly, activities, announcements, pendingLeaveCount] =
      await Promise.all([
        this.stats(companyId),
        this.weekly(companyId),
        this.monthly(companyId),
        this.activities(companyId),
        this.announcements(companyId),
        this.prisma.leaveRequest.count({
          where: { companyId, status: "pending", deletedAt: null },
        }),
      ]);
    return { stats, weekly, monthly, activities, announcements, pendingLeaveCount };
  }

  async weekly(companyId: string) {
    const rows = await this.prisma.weeklyStat.findMany({
      where: { companyId },
      orderBy: { day: "asc" },
    });
    return rows.map((r) => ({
      id: r.id,
      day: r.day,
      present: r.present,
      late: r.late,
      absent: r.absent,
      wfh: r.wfh,
      companyId: r.companyId,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      createdBy: "",
      updatedBy: "",
      deletedAt: null,
      isArchived: false,
      version: r.version,
      metadata: r.metadata ?? {},
    }));
  }

  async monthly(companyId: string) {
    const rows = await this.prisma.monthlyStat.findMany({
      where: { companyId },
      orderBy: { month: "asc" },
    });
    return rows.map((r) => ({
      id: r.id,
      month: r.month,
      attendanceRate: r.attendanceRate,
      lateCount: r.lateCount,
      absentCount: r.absentCount,
      avgHours: r.avgHours,
      companyId: r.companyId,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      createdBy: "",
      updatedBy: "",
      deletedAt: null,
      isArchived: false,
      version: r.version,
      metadata: r.metadata ?? {},
    }));
  }

  async activities(companyId: string, limit = 20) {
    const rows = await this.prisma.activity.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { timestamp: "desc" },
      take: limit,
    });
    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      employeeId: r.employeeId ?? undefined,
      title: r.title,
      description: r.description,
      timestamp: iso(r.timestamp),
      ...auditFields(r),
    }));
  }

  async announcements(companyId: string, priority?: string) {
    const rows = await this.prisma.announcement.findMany({
      where: {
        companyId,
        deletedAt: null,
        ...(priority ? { priority } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      author: r.author,
      priority: r.priority,
      ...auditFields(r),
    }));
  }
}
