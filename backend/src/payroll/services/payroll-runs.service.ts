import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsService } from "../../notifications/notifications.service";
import {
  normalizeRunStatus,
  nextRunStatus,
  periodBounds,
  roundMoney,
  slipDeductionsTotal,
} from "../payroll.helpers";
import { PayrollPoliciesService } from "./payroll-policies.service";
import { PayrollSalaryService } from "./payroll-salary.service";
import { PayrollPayslipCalcService } from "./payroll-payslip-calc.service";

/** Payroll run lifecycle: advance (draft → paid), cancel, and run history. */
@Injectable()
export class PayrollRunsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly policiesService: PayrollPoliciesService,
    private readonly salaryService: PayrollSalaryService,
    private readonly payslipCalc: PayrollPayslipCalcService
  ) {}

  async advance(companyId: string, actorId = "system") {
    const period = periodBounds();
    const policy = await this.policiesService.getMergedPolicy(companyId);

    const latest = await this.prisma.payrollRun.findFirst({
      where: { companyId, periodId: period.periodId },
      orderBy: { createdAt: "desc" },
    });
    const currentStatus = normalizeRunStatus(latest?.status);
    if (currentStatus === "paid") {
      throw new BadRequestException(
        "Payroll for this period is already paid and locked"
      );
    }
    const nextStatus = nextRunStatus(currentStatus);
    const shouldRecalculate =
      !latest ||
      currentStatus === "draft" ||
      currentStatus === "hr_review";

    const employees = await this.prisma.employee.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: { in: ["active", "on_leave"] },
      },
      orderBy: { employeeCode: "asc" },
    });

    let totalDeductions = 0;
    let totalOvertime = 0;
    let netPayroll = 0;
    let estimatedCost = 0;

    if (shouldRecalculate) {
      for (const emp of employees) {
        const existing = await this.salaryService.findSalary(companyId, emp.id);
        if (!existing) {
          // Do not invent seed salaries — admin must set a profile first.
          continue;
        }
        const profile = existing;
        const slip = await this.payslipCalc.computePayslip(
          companyId,
          emp.id,
          period,
          policy,
          profile
        );
        totalDeductions += slip.deductionsTotal;
        totalOvertime += slip.overtimePay;
        netPayroll += slip.net;
        estimatedCost += slip.employerCost;

        await this.prisma.employeePayslip.upsert({
          where: {
            companyId_employeeId_periodId: {
              companyId,
              employeeId: emp.id,
              periodId: period.periodId,
            },
          },
          create: {
            companyId,
            employeeId: emp.id,
            periodId: period.periodId,
            payload: slip as unknown as Prisma.InputJsonValue,
          },
          update: {
            payload: slip as unknown as Prisma.InputJsonValue,
            version: { increment: 1 },
          },
        });
      }
    } else {
      const slips = await this.prisma.employeePayslip.findMany({
        where: { companyId, periodId: period.periodId },
      });
      for (const row of slips) {
        const p = (row.payload ?? {}) as Record<string, number | undefined>;
        totalDeductions += slipDeductionsTotal(p);
        totalOvertime += Number(p.overtimePay ?? 0);
        netPayroll += Number(p.net ?? p.netPay ?? 0);
        estimatedCost += Number(p.employerCost ?? 0);
      }
    }

    const prevPayload = (latest?.payload ?? {}) as Record<string, unknown>;
    const runPayload = {
      id: (prevPayload.id as string) ?? `run_${period.periodId}`,
      companyId,
      periodId: period.periodId,
      status: nextStatus,
      employeeCount: employees.length,
      estimatedCost: roundMoney(estimatedCost),
      totalDeductions: roundMoney(totalDeductions),
      totalOvertime: roundMoney(totalOvertime),
      netPayroll: roundMoney(netPayroll),
      averageSalary:
        employees.length > 0 ? roundMoney(netPayroll / employees.length) : 0,
      employerCostTotal: roundMoney(estimatedCost),
      pendingCount: nextStatus === "paid" || nextStatus === "approved" ? 0 : employees.length,
      createdAt: (prevPayload.createdAt as string) ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: (prevPayload.createdBy as string) ?? actorId,
      updatedBy: actorId,
      deletedAt: null,
      isArchived: false,
      version: Number(prevPayload.version ?? 1) + 1,
      metadata: {
        linkedToAttendance: true,
        recalculated: shouldRecalculate,
        previousStatus: currentStatus,
      },
    };

    if (latest) {
      await this.prisma.payrollRun.update({
        where: { id: latest.id },
        data: {
          status: nextStatus,
          payload: runPayload as unknown as Prisma.InputJsonValue,
        },
      });
    } else {
      await this.prisma.payrollRun.create({
        data: {
          companyId,
          periodId: period.periodId,
          status: nextStatus,
          payload: runPayload as unknown as Prisma.InputJsonValue,
        },
      });
    }

    await this.notifications.notifyDomain({
      companyId,
      actorId,
      category: "payroll",
      priority: nextStatus === "paid" ? "urgent" : "high",
      audience: "admin",
      titleKey: "notifications.payrollRunTitle",
      bodyKey: "notifications.payrollRunBody",
      vars: { period: period.periodId, net: runPayload.netPayroll },
      href: "/payroll",
      entityType: "payroll_run",
      entityId: runPayload.id,
    });

    return runPayload;
  }

  /**
   * Admin cancel: unlock period (even if paid), delete calculated payslips,
   * and reset the current run back to draft so payroll can be redone.
   */
  async cancel(companyId: string, actorId = "system") {
    const period = periodBounds();
    const latest = await this.prisma.payrollRun.findFirst({
      where: { companyId, periodId: period.periodId },
      orderBy: { createdAt: "desc" },
    });
    if (!latest) {
      throw new BadRequestException("No payroll run exists for this period");
    }

    const previousStatus = normalizeRunStatus(latest.status);
    await this.prisma.employeePayslip.deleteMany({
      where: { companyId, periodId: period.periodId },
    });

    const headcount = await this.prisma.employee.count({
      where: {
        companyId,
        deletedAt: null,
        status: { in: ["active", "on_leave"] },
      },
    });
    const prevPayload = (latest.payload ?? {}) as Record<string, unknown>;
    const runPayload = {
      id: (prevPayload.id as string) ?? `run_${period.periodId}`,
      companyId,
      periodId: period.periodId,
      status: "draft" as const,
      employeeCount: headcount,
      estimatedCost: 0,
      totalDeductions: 0,
      totalOvertime: 0,
      netPayroll: 0,
      averageSalary: 0,
      employerCostTotal: 0,
      pendingCount: headcount,
      createdAt: (prevPayload.createdAt as string) ?? latest.createdAt.toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: (prevPayload.createdBy as string) ?? actorId,
      updatedBy: actorId,
      deletedAt: null,
      isArchived: false,
      version: Number(prevPayload.version ?? 1) + 1,
      metadata: {
        cancelled: true,
        cancelledAt: new Date().toISOString(),
        cancelledBy: actorId,
        previousStatus,
      },
    };

    await this.prisma.payrollRun.update({
      where: { id: latest.id },
      data: {
        status: "draft",
        payload: runPayload as unknown as Prisma.InputJsonValue,
      },
    });

    await this.notifications.notifyDomain({
      companyId,
      actorId,
      category: "payroll",
      priority: "high",
      audience: "admin",
      titleKey: "notifications.payrollCancelledTitle",
      bodyKey: "notifications.payrollCancelledBody",
      vars: { period: period.periodId },
      href: "/payroll",
      entityType: "payroll_run",
      entityId: runPayload.id,
    });

    return runPayload;
  }

  async listRuns(companyId: string) {
    const rows = await this.prisma.payrollRun.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 24,
    });
    return rows.map((row) => {
      const p = (row.payload ?? {}) as Record<string, unknown>;
      return {
        id: (p.id as string) ?? row.id,
        companyId,
        periodId: row.periodId,
        status: normalizeRunStatus(row.status),
        employeeCount: Number(p.employeeCount ?? 0),
        estimatedCost: Number(p.estimatedCost ?? 0),
        totalDeductions: Number(p.totalDeductions ?? 0),
        totalOvertime: Number(p.totalOvertime ?? 0),
        netPayroll: Number(p.netPayroll ?? 0),
        averageSalary: Number(p.averageSalary ?? 0),
        employerCostTotal: Number(p.employerCostTotal ?? 0),
        pendingCount: Number(p.pendingCount ?? 0),
        createdAt: (p.createdAt as string) ?? row.createdAt.toISOString(),
        updatedAt: (p.updatedAt as string) ?? row.updatedAt.toISOString(),
        createdBy: (p.createdBy as string) ?? "system",
        updatedBy: (p.updatedBy as string) ?? "system",
        deletedAt: null,
        isArchived: false,
        version: Number(p.version ?? 1),
        metadata: (p.metadata as Record<string, unknown>) ?? {},
      };
    });
  }
}
