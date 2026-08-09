import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { parseDate } from "../common/mappers";
import { utcDay } from "../lib/work-time";
import { mapAttendance } from "./attendance-mappers";

/** Read-side attendance queries. */
@Injectable()
export class AttendanceQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    companyId: string,
    filters: {
      employeeId?: string;
      date?: string;
      status?: string;
      from?: string;
      to?: string;
    } = {}
  ) {
    const where: Prisma.AttendanceRecordWhereInput = {
      companyId,
      deletedAt: null,
    };
    if (filters.employeeId) where.employeeId = filters.employeeId;
    if (filters.status) where.status = filters.status;
    if (filters.date) where.date = parseDate(filters.date);
    if (filters.from || filters.to) {
      where.date = {
        ...(filters.from ? { gte: parseDate(filters.from) } : {}),
        ...(filters.to ? { lte: parseDate(filters.to) } : {}),
      };
    }
    const rows = await this.prisma.attendanceRecord.findMany({
      where,
      orderBy: { date: "desc" },
    });
    return rows.map(mapAttendance);
  }

  async meToday(companyId: string, employeeId?: string) {
    if (!employeeId) return null;
    const day = utcDay();
    const row = await this.prisma.attendanceRecord.findFirst({
      where: { companyId, employeeId, date: day, deletedAt: null },
    });
    return row ? mapAttendance(row) : null;
  }
}
