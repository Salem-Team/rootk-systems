import { BadRequestException, Injectable } from "@nestjs/common";
import { EmployeeStatus, LeaveStatus, TaskStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { isoOrNull, parseDate, parseDateEnd } from "../common/mappers";
import { canViewOthersInModule } from "../common/permissions-catalog";
import { listDirectReportIds } from "../lib/team";
import { buildDailyReportFacts, isValidReportDate } from "../lib/daily-report";

type Actor = {
  userId: string;
  role: string;
  employeeId: string;
  permissions?: string[];
};

@Injectable()
export class DailyPlanReportService {
  constructor(private readonly prisma: PrismaService) {}

  async getReport(
    companyId: string,
    actor: Actor,
    query: { date?: string; from?: string; to?: string }
  ) {
    const date = (query.date ?? "").trim();
    const from = (query.from ?? date).trim();
    const to = (query.to ?? date).trim();
    if (!isValidReportDate(from) || !isValidReportDate(to) || from > to) {
      throw new BadRequestException("date must be YYYY-MM-DD");
    }

    const employees = await this.scopedEmployees(companyId, actor);
    const ids = employees.map((e) => e.id);
    const idSet = new Set(ids);
    if (ids.length === 0) {
      return { date: from === to ? from : `${from}…${to}`, from, to, rows: [] };
    }

    const start = parseDate(from);
    const end = parseDateEnd(to);
    const singleDay = from === to;

    const [attendance, completedTasks, openTasks, ads, crm, feedback, leaves, meetings] =
      await Promise.all([
        this.prisma.attendanceRecord.findMany({
          where: {
            companyId,
            deletedAt: null,
            date: { gte: start, lte: parseDate(to) },
            employeeId: { in: ids },
          },
        }),
        this.prisma.workTask.findMany({
          where: {
            companyId,
            deletedAt: null,
            status: TaskStatus.completed,
            completedAt: { gte: start, lte: end },
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
            addedAt: { gte: start, lte: end },
          },
          select: { ownerEmployeeId: true },
        }),
        this.prisma.crmLeadActivity.findMany({
          where: {
            companyId,
            deletedAt: null,
            actorEmployeeId: { in: ids },
            occurredAt: { gte: start, lte: end },
          },
          select: { actorEmployeeId: true },
        }),
        this.prisma.crmLeadFeedback.findMany({
          where: {
            companyId,
            deletedAt: null,
            recordedByEmployeeId: { in: ids },
            createdAt: { gte: start, lte: end },
          },
          select: { recordedByEmployeeId: true, callAnswered: true },
        }),
        this.prisma.leaveRequest.findMany({
          where: {
            companyId,
            deletedAt: null,
            status: LeaveStatus.approved,
            employeeId: { in: ids },
            startDate: { lte: parseDate(to) },
            endDate: { gte: start },
          },
          select: { employeeId: true },
        }),
        this.prisma.workMeeting.findMany({
          where: {
            companyId,
            deletedAt: null,
            date: { gte: start, lte: parseDate(to) },
            participantIds: { hasSome: ids },
          },
          select: { participantIds: true },
        }),
      ]);

    const workingBy = new Map<string, number>();
    const presentBy = new Map<string, number>();
    const lateBy = new Map<string, number>();
    const absentBy = new Map<string, number>();
    const attendanceBy = new Map<string, (typeof attendance)[number]>();
    for (const row of attendance) {
      workingBy.set(row.employeeId, (workingBy.get(row.employeeId) ?? 0) + row.workingMinutes);
      if (row.status === "late") lateBy.set(row.employeeId, (lateBy.get(row.employeeId) ?? 0) + 1);
      else if (row.status === "absent") {
        absentBy.set(row.employeeId, (absentBy.get(row.employeeId) ?? 0) + 1);
      } else if (
        row.status === "present" ||
        row.status === "wfh" ||
        row.status === "early_leave" ||
        row.status === "half_day"
      ) {
        presentBy.set(row.employeeId, (presentBy.get(row.employeeId) ?? 0) + 1);
      }
      attendanceBy.set(row.employeeId, row);
    }

    const onLeave = new Set(leaves.map((l) => l.employeeId));
    const adsBy = countBy(ads.map((a) => a.ownerEmployeeId));
    const crmBy = countBy(
      crm.map((c) => c.actorEmployeeId).filter((id): id is string => !!id)
    );
    const activeCallsBy = countBy(
      feedback
        .filter((f) => f.callAnswered && f.recordedByEmployeeId)
        .map((f) => f.recordedByEmployeeId as string)
    );
    const inactiveCallsBy = countBy(
      feedback
        .filter((f) => !f.callAnswered && f.recordedByEmployeeId)
        .map((f) => f.recordedByEmployeeId as string)
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
          : singleDay
            ? att?.status ?? null
            : null;
        const adsCount = adsBy.get(employee.id) ?? 0;
        const crmCount = crmBy.get(employee.id) ?? 0;
        const crmActiveCalls = activeCallsBy.get(employee.id) ?? 0;
        const crmInactiveCalls = inactiveCallsBy.get(employee.id) ?? 0;
        const meetingsCount = meetingsBy.get(employee.id) ?? 0;
        return {
          employeeId: employee.id,
          name: employee.name,
          department: employee.department,
          attendanceStatus,
          checkIn: isoOrNull(att?.checkIn ?? null),
          checkOut: isoOrNull(att?.checkOut ?? null),
          workingMinutes: workingBy.get(employee.id) ?? 0,
          tasksCompleted: taskTitles.length,
          taskTitles,
          tasksOpen: openBy.get(employee.id) ?? 0,
          adsCount,
          crmCount,
          crmActiveCalls,
          crmInactiveCalls,
          meetingsCount,
          presentDays: presentBy.get(employee.id) ?? 0,
          lateDays: lateBy.get(employee.id) ?? 0,
          absentDays: absentBy.get(employee.id) ?? 0,
          facts: buildDailyReportFacts({
            onLeave: onLeave.has(employee.id),
            attendanceStatus,
            taskTitles,
            adsCount,
            crmCount,
            meetingsCount,
            activeCalls: crmActiveCalls,
            inactiveCalls: crmInactiveCalls,
          }),
        };
      });

    return {
      date: singleDay ? from : `${from}…${to}`,
      from,
      to,
      rows,
    };
  }

  private async scopedEmployees(companyId: string, actor: Actor) {
    const where = {
      companyId,
      deletedAt: null,
      status: { not: EmployeeStatus.inactive },
    };
    const others = canViewOthersInModule(
      actor.permissions,
      "dailyPlan.viewAll",
      "dailyPlan.viewTeam",
      actor.role
    );
    if (others.all) {
      return this.prisma.employee.findMany({
        where,
        select: { id: true, name: true, department: true },
      });
    }
    if (others.team) {
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
    const ownId = actor.employeeId?.trim();
    if (!ownId) return [];
    return this.prisma.employee.findMany({
      where: { ...where, id: ownId },
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
