import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { LeaveStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { auditFields, dateOnly, iso, parseDate } from "../common/mappers";
import {
  assertEmployeeInScope,
  employeeIdsForModule,
  prismaEmployeeFilter,
} from "../common/employee-scope";
import { hasPermissionId } from "../common/permissions-catalog";
import { listDirectReportIds } from "../lib/team";
import type { JwtPayload } from "../common/decorators/current-user";
import { NotificationsService } from "../notifications/notifications.service";
import { writeActivity } from "../common/activity-writer";

function mapLeave(row: {
  id: string;
  companyId: string;
  employeeId: string;
  type: string;
  status: LeaveStatus;
  startDate: Date;
  endDate: Date;
  days: number;
  reason: string;
  submittedAt: Date;
  reviewedAt: Date | null;
  reviewerNote: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  deletedAt: Date | null;
  isArchived: boolean;
  version: number;
  metadata: unknown;
}) {
  return {
    id: row.id,
    employeeId: row.employeeId,
    type: row.type,
    status: row.status,
    startDate: dateOnly(row.startDate),
    endDate: dateOnly(row.endDate),
    days: row.days,
    reason: row.reason,
    submittedAt: iso(row.submittedAt),
    reviewedAt: row.reviewedAt ? iso(row.reviewedAt) : undefined,
    reviewerNote: row.reviewerNote ?? undefined,
    ...auditFields(row),
  };
}

function eachDate(start: Date, end: Date): Date[] {
  const out: Date[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    out.push(new Date(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

@Injectable()
export class LeaveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService
  ) {}

  async list(
    companyId: string,
    filters: { employeeId?: string; status?: string; type?: string } = {},
    actor?: JwtPayload
  ) {
    const where: Prisma.LeaveRequestWhereInput = { companyId, deletedAt: null };
    if (actor) {
      const allowed = await employeeIdsForModule(
        this.prisma,
        companyId,
        actor,
        "leave.viewAll",
        "leave.viewTeam"
      );
      if (filters.employeeId) {
        assertEmployeeInScope(filters.employeeId, allowed);
        where.employeeId = filters.employeeId;
      } else {
        Object.assign(where, prismaEmployeeFilter(allowed));
      }
    } else if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }
    if (filters.status) where.status = filters.status as LeaveStatus;
    if (filters.type) where.type = filters.type;
    const rows = await this.prisma.leaveRequest.findMany({
      where,
      orderBy: { submittedAt: "desc" },
    });
    return rows.map(mapLeave);
  }

  async byId(companyId: string, id: string, actor?: JwtPayload) {
    const row = await this.prisma.leaveRequest.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!row) return null;
    if (actor) {
      const allowed = await employeeIdsForModule(
        this.prisma,
        companyId,
        actor,
        "leave.viewAll",
        "leave.viewTeam"
      );
      assertEmployeeInScope(row.employeeId, allowed);
    }
    return mapLeave(row);
  }

  async create(
    companyId: string,
    actorId: string,
    body: {
      employeeId?: string;
      type: string;
      startDate: string;
      endDate: string;
      days: number;
      reason: string;
    },
    fallbackEmployeeId?: string
  ) {
    const employeeId = body.employeeId ?? fallbackEmployeeId;
    const row = await this.prisma.leaveRequest.create({
      data: {
        companyId,
        employeeId: employeeId!,
        type: body.type,
        status: LeaveStatus.pending,
        startDate: parseDate(body.startDate),
        endDate: parseDate(body.endDate),
        days: body.days,
        reason: body.reason,
        submittedAt: new Date(),
        createdBy: actorId,
        updatedBy: actorId,
      },
    });

    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId!, companyId },
    });

    const leaveRule = await this.prisma.approvalRule.findFirst({
      where: {
        companyId,
        labelKey: "admin.approvalLeave",
        deletedAt: null,
      },
    });
    const needsApproval = leaveRule?.requiresApproval !== false;

    if (!needsApproval) {
      return this.decide(
        companyId,
        actorId,
        row.id,
        "approved",
        "Auto-approved (leave approval rule off)"
      );
    }

    await this.notifications.notifyDomain({
      companyId,
      actorId,
      category: "leave",
      priority: "normal",
      audience: "admin",
      titleKey: "notifications.leaveSubmittedTitle",
      bodyKey: "notifications.leaveSubmittedBody",
      vars: { name: employee?.name ?? employeeId, type: body.type },
      href: "/leave",
      entityType: "leave",
      entityId: row.id,
    });
    await writeActivity(this.prisma, {
      companyId,
      type: "leave_request",
      title: "Leave requested",
      description: `${employee?.name ?? employeeId} · ${body.type}`,
      employeeId: employeeId!,
      actorId,
    });

    return mapLeave(row);
  }

  async decide(
    companyId: string,
    actorId: string,
    id: string,
    status: "approved" | "rejected",
    reviewerNote?: string,
    actor?: JwtPayload
  ) {
    const current = await this.prisma.leaveRequest.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!current) throw new NotFoundException("Leave request not found");
    if (actor) {
      const allPerm = status === "approved" ? "leave.approve" : "leave.reject";
      const teamPerm =
        status === "approved" ? "leave.approveTeam" : "leave.rejectTeam";
      const canAll = hasPermissionId(allPerm, actor.permissions, actor.role);
      const canTeam = hasPermissionId(teamPerm, actor.permissions, actor.role);
      if (!canAll) {
        if (!canTeam) {
          throw new ForbiddenException("You do not have permission for this action");
        }
        const reports = actor.employeeId
          ? await listDirectReportIds(this.prisma, companyId, actor.employeeId)
          : [];
        if (!reports.includes(current.employeeId)) {
          throw new ForbiddenException(
            "You can only act on people who report directly to you"
          );
        }
      }
    }

    const row = await this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status:
          status === "approved" ? LeaveStatus.approved : LeaveStatus.rejected,
        reviewedAt: new Date(),
        reviewerNote,
        updatedBy: actorId,
        version: { increment: 1 },
      },
    });

    if (status === "approved") {
      const days = eachDate(current.startDate, current.endDate);
      for (const day of days) {
        const existing = await this.prisma.attendanceRecord.findFirst({
          where: {
            companyId,
            employeeId: current.employeeId,
            date: day,
            deletedAt: null,
          },
        });
        if (existing?.checkIn) continue;
        if (existing) {
          await this.prisma.attendanceRecord.update({
            where: { id: existing.id },
            data: {
              status: "on_leave",
              updatedBy: actorId,
              version: { increment: 1 },
            },
          });
        } else {
          await this.prisma.attendanceRecord.create({
            data: {
              companyId,
              employeeId: current.employeeId,
              date: day,
              status: "on_leave",
              createdBy: actorId,
              updatedBy: actorId,
            },
          });
        }
      }
      await this.prisma.employee.updateMany({
        where: { id: current.employeeId, companyId },
        data: { status: "on_leave", updatedBy: actorId },
      });
    }

    const employeeUser = await this.prisma.user.findFirst({
      where: { companyId, employeeId: current.employeeId, deletedAt: null },
    });
    await this.notifications.notifyDomain({
      companyId,
      actorId,
      category: "leave",
      priority: "high",
      audience: "employee",
      titleKey:
        status === "approved"
          ? "notifications.leaveApprovedTitle"
          : "notifications.leaveRejectedTitle",
      bodyKey:
        status === "approved"
          ? "notifications.leaveApprovedBody"
          : "notifications.leaveRejectedBody",
      vars: { type: current.type },
      href: "/leave",
      entityType: "leave",
      entityId: row.id,
      recipientIds: employeeUser ? [employeeUser.id] : [],
    });
    await writeActivity(this.prisma, {
      companyId,
      type: status === "approved" ? "leave_approved" : "leave_rejected",
      title: status === "approved" ? "Leave approved" : "Leave rejected",
      description: current.type,
      employeeId: current.employeeId,
      actorId,
    });

    return mapLeave(row);
  }

  async remove(companyId: string, actorId: string, id: string) {
    const current = await this.prisma.leaveRequest.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!current) throw new NotFoundException("Leave request not found");
    const row = await this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status: LeaveStatus.cancelled,
        deletedAt: new Date(),
        isArchived: true,
        updatedBy: actorId,
        version: { increment: 1 },
      },
    });

    await this.notifications.notifyDomain({
      companyId,
      actorId,
      category: "leave",
      priority: "normal",
      audience: "admin",
      titleKey: "notifications.leaveCancelledTitle",
      bodyKey: "notifications.leaveCancelledBody",
      vars: { type: current.type },
      href: "/leave",
      entityType: "leave",
      entityId: row.id,
    });

    return mapLeave(row);
  }
}
