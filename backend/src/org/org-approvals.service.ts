import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { mapApproval } from "./org-mappers";

/** Approval rules, seeded with defaults on first read. */
@Injectable()
export class OrgApprovalsService {
  constructor(private readonly prisma: PrismaService) {}

  async listApprovals(companyId: string) {
    let rows = await this.prisma.approvalRule.findMany({
      where: { companyId, deletedAt: null },
    });

    const defaults = [
      {
        labelKey: "admin.approvalAttendance",
        requiresApproval: false,
        approver: "manager",
      },
      {
        labelKey: "admin.approvalLeave",
        requiresApproval: true,
        approver: "hr",
      },
      {
        labelKey: "admin.approvalWfh",
        requiresApproval: true,
        approver: "manager",
      },
      {
        labelKey: "admin.approvalOvertime",
        requiresApproval: true,
        approver: "hr",
      },
    ] as const;

    const existingKeys = new Set(rows.map((r) => r.labelKey));
    const missing = defaults.filter((d) => !existingKeys.has(d.labelKey));
    if (missing.length > 0) {
      await this.prisma.approvalRule.createMany({
        data: missing.map((d) => ({
          companyId,
          labelKey: d.labelKey,
          requiresApproval: d.requiresApproval,
          approver: d.approver,
          createdBy: "system",
          updatedBy: "system",
        })),
      });
      rows = await this.prisma.approvalRule.findMany({
        where: { companyId, deletedAt: null },
      });
    }

    if (rows.length === 0) {
      await this.prisma.approvalRule.createMany({
        data: defaults.map((d) => ({
          companyId,
          labelKey: d.labelKey,
          requiresApproval: d.requiresApproval,
          approver: d.approver,
          createdBy: "system",
          updatedBy: "system",
        })),
      });
      rows = await this.prisma.approvalRule.findMany({
        where: { companyId, deletedAt: null },
      });
    }

    return rows.map(mapApproval);
  }

  async patchApproval(companyId: string, actorId: string, id: string, requiresApproval: boolean) {
    const current = await this.prisma.approvalRule.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!current) throw new NotFoundException("Approval rule not found");
    await this.prisma.approvalRule.update({
      where: { id },
      data: { requiresApproval, updatedBy: actorId, version: { increment: 1 } },
    });
    return this.listApprovals(companyId);
  }
}
