import { BadRequestException, Injectable } from "@nestjs/common";
import { EmployeeStatus, LeaveStatus, TaskStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { isoOrNull, parseDate, parseDateEnd } from "../common/mappers";
import { AppRole } from "../common/roles";
import { listDirectReportIds } from "../lib/team";
import { buildDailyReportFacts, isValidReportDate } from "../lib/daily-report";

type Actor = { userId: string; role: string; employeeId: string };

@Injectable()
export class DailyPlanReportService {
  constructor(private readonly prisma: PrismaService) {}

  async getReport(companyId: string, actor: Actor, dateRaw: string) {
    const date = dateRaw.trim();
    if (!isValidReportDate(date)) {
      throw new BadRequestException("date must be YYYY-MM-DD");
    }

    const employees = await this.scopedEmployees(companyId, actor);
    const ids = employees.map((e) => e.id);
    const idSet = new Set(ids);
    if (ids.length === 0) {
      return { date, rows: [] };
    }

    const day = parseDate(date);
    const dayEnd = parseDateEnd(date);

    const [attendance, completedTasks, openTasks, ads, crm, leaves, meetings] =
      await Promise.all([
        this.prisma.attendanceRecord.findMany({
          where: { companyId, deletedAt: null, date: day, employeeId: { in: ids } },
        }),
        this.prisma.workTask.findMany({
          where: {
            companyId,
            deletedAt: null,
            status: TaskStatus.completed,
            completedAt: { gte: day, lte: dayEnd },
            assigneeIds: { hasSome: ids },
          },
          select: { title: true, assigneeIds: true },
        }),
        this.prisma.workTask.findMany({
          where: {
            companyId,
            deletedAt: null,
            status: { not: TaskStatus.completed },
            assigneeIds: { hasSome: ids },
          },
          select: { assigneeIds: true },
        }),
        this.prisma.organicAdvertisement.findMany({
          where: {
            companyId,
            deletedAt: null,
            ownerEmployeeId: { in: ids },
            addedAt: { gte: day, lte: dayEnd },
          },
          select: { ownerEmployeeId: true },
        }),
        this.prisma.crmLeadActivity.findMany({
          where: {
            companyId,
            deletedAt: null,
            actorEmployeeId: { in: ids },
            occurredAt: { gte: day, lte: dayEnd },
          },
          select: { actorEmployeeId: true },
        }),
        this.prisma.leaveRequest.findMany({
          where: {
            companyId,
            deletedAt: null,
            status: LeaveStatus.approved,
            employeeId: { in: ids },
            startDate: { lte: day },
            endDate: { gte: day },
          },
          select: { employeeId: true },
        }),
        this.prisma.workMeeting.findMany({
          where: {
            companyId,
            deletedAt: null,
            date: day,
            participantIds: { hasSome: ids },
          },
          select: { participantIds: true },
        }),
      ]);

    const attendanceBy = new Map(attendance.map((r) => [r.employeeId, r]));
    const onLeave = new Set(leaves.map((l) => l.employeeId));
    const adsBy = countBy(ads.map((a) => a.ownerEmployeeId));
    const crmBy = countBy(
      crm.map((c) => c.actorEmployeeId).filter((id): id is string => !!id)
    );

    const completedBy = new Map<string, string[]>();
    for (const task of completedTasks) {
      for (const id of task.assigneeIds) {
        if (!idSet.has(id)) continue;
        const list = completedBy.get(id) ?? [];
        list.push(task.title);
        completedBy.set(id, list);
      }
    }
    const openBy = new Map<string, number>();
    for (const task of openTasks) {
      for (const id of task.assigneeIds) {
        if (!idSet.has(id)) continue;
        openBy.set(id, (openBy.get(id) ?? 0) + 1);
      }
    }
    const meetingsBy = new Map<string, number>();
    for (const meeting of meetings) {
      for (const id of meeting.participantIds) {
        if (!idSet.has(id)) continue;
        meetingsBy.set(id, (meetingsBy.get(id) ?? 0) + 1);
      }
    }

    const rows = employees
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((employee) => {
        const att = attendanceBy.get(employee.id);
        const taskTitles = completedBy.get(employee.id) ?? [];
        const attendanceStatus = onLeave.has(employee.id)
          ? "on_leave"
          : att?.status ?? null;
        const adsCount = adsBy.get(employee.id) ?? 0;
        const crmCount = crmBy.get(employee.id) ?? 0;
        const meetingsCount = meetingsBy.get(employee.id) ?? 0;
        return {
          employeeId: employee.id,
          name: employee.name,
          department: employee.department,
          attendanceStatus,
          checkIn: isoOrNull(att?.checkIn ?? null),
          checkOut: isoOrNull(att?.checkOut ?? null),
          workingMinutes: att?.workingMinutes ?? 0,
          tasksCompleted: taskTitles.length,
          taskTitles,
          tasksOpen: openBy.get(employee.id) ?? 0,
          adsCount,
          crmCount,
          meetingsCount,
          facts: buildDailyReportFacts({
            onLeave: onLeave.has(employee.id),
            attendanceStatus,
            taskTitles,
            adsCount,
            crmCount,
            meetingsCount,
          }),
        };
      });

    return { date, rows };
  }

  private async scopedEmployees(companyId: string, actor: Actor) {
    const where = {
      companyId,
      deletedAt: null,
      status: { not: EmployeeStatus.inactive },
    };
    if (actor.role === AppRole.admin) {
      return this.prisma.employee.findMany({
        where,
        select: { id: true, name: true, department: true },
      });
    }
    const reportIds = await listDirectReportIds(
      this.prisma,
      companyId,
      actor.employeeId
    );
    const allowed = new Set([actor.employeeId, ...reportIds].filter(Boolean));
    return this.prisma.employee.findMany({
      where: { ...where, id: { in: [...allowed] } },
      select: { id: true, name: true, department: true },
    });
  }
}

function countBy(ids: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const id of ids) {
    map.set(id, (map.get(id) ?? 0) + 1);
  }
  return map;
}
