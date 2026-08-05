import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DemoService {
  constructor(private readonly prisma: PrismaService) {}

  private async wipeTransactional(companyId: string) {
    await this.prisma.refreshToken.deleteMany({});
    await this.prisma.appNotification.deleteMany({ where: { companyId } });
    await this.prisma.workTask.deleteMany({ where: { companyId } });
    await this.prisma.workMeeting.deleteMany({ where: { companyId } });
    await this.prisma.leaveRequest.deleteMany({ where: { companyId } });
    await this.prisma.attendanceRecord.deleteMany({ where: { companyId } });
    await this.prisma.activity.deleteMany({ where: { companyId } });
    await this.prisma.employeePayslip.deleteMany({ where: { companyId } });
    await this.prisma.payrollRun.deleteMany({ where: { companyId } });
    await this.prisma.announcement.deleteMany({ where: { companyId } });
    await this.prisma.weeklyStat.deleteMany({ where: { companyId } });
    await this.prisma.monthlyStat.deleteMany({ where: { companyId } });
  }

  private async reseedSample(companyId: string) {
    const employees = await this.prisma.employee.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { employeeCode: "asc" },
    });

    await this.prisma.announcement.create({
      data: {
        companyId,
        title: "Welcome to ROOTK HR",
        body: "Demo data was reset. PostgreSQL seed is ready for exploration.",
        author: "Nour Al-Admin",
        priority: "medium",
        createdBy: "system",
        updatedBy: "system",
      },
    });

    await this.prisma.weeklyStat.createMany({
      data: ["Sun", "Mon", "Tue", "Wed", "Thu"].map((day, i) => ({
        companyId,
        day,
        present: 3 + (i % 2),
        late: i === 1 ? 1 : 0,
        absent: i === 3 ? 1 : 0,
        wfh: i === 0 || i === 2 ? 1 : 0,
      })),
    });

    const now = new Date();
    await this.prisma.monthlyStat.create({
      data: {
        companyId,
        month: `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`,
        attendanceRate: 92.5,
        lateCount: 4,
        absentCount: 2,
        avgHours: 7.6,
      },
    });

    const day = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );
    for (const emp of employees.slice(0, 3)) {
      await this.prisma.attendanceRecord.create({
        data: {
          companyId,
          employeeId: emp.id,
          date: day,
          checkIn: new Date(`${day.toISOString().slice(0, 10)}T06:15:00.000Z`),
          status: emp.id === "emp_001" ? "late" : "present",
          isLate: emp.id === "emp_001",
          lateMinutes: emp.id === "emp_001" ? 20 : 0,
          createdBy: "system",
          updatedBy: "system",
        },
      });
    }

    if (employees[0]) {
      await this.prisma.activity.createMany({
        data: [
          {
            companyId,
            type: "check_in",
            employeeId: employees[0].id,
            title: "Check-in",
            description: employees[0].name,
            timestamp: new Date(),
            createdBy: "system",
            updatedBy: "system",
          },
          {
            companyId,
            type: "announcement",
            title: "Demo reset",
            description: "Sample dataset regenerated from Nest API",
            timestamp: new Date(),
            createdBy: "system",
            updatedBy: "system",
          },
        ],
      });
    }

    await this.prisma.appNotification.create({
      data: {
        companyId,
        titleKey: "notifications.systemTitle",
        bodyKey: "notifications.demoResetBody",
        category: "system",
        priority: "normal",
        audience: "all",
        recipientIds: [],
        href: "/dashboard",
        vars: { at: new Date().toISOString() } as Prisma.InputJsonValue,
        createdBy: "system",
        updatedBy: "system",
      },
    });
  }

  async reset(companyId: string) {
    await this.wipeTransactional(companyId);
    await this.reseedSample(companyId);
    return true;
  }

  async generate(companyId: string) {
    await this.reseedSample(companyId);
    return true;
  }

  async clear(companyId: string) {
    await this.wipeTransactional(companyId);
    return true;
  }
}
