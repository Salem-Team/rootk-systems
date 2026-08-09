import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { dateOnly } from "../../common/mappers";
import type { SalaryPayload } from "../payroll.types";
import { PayrollSalaryService } from "./payroll-salary.service";

/** Admin salary profile mutations (basic/allowances/deductions edits + history). */
@Injectable()
export class PayrollSalaryUpdateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly salaryService: PayrollSalaryService
  ) {}

  async patchSalaryProfile(
    companyId: string,
    employeeId: string,
    body: Record<string, unknown>,
    actorId: string
  ) {
    const emp = await this.prisma.employee.findFirst({
      where: { id: employeeId, companyId, deletedAt: null },
    });
    if (!emp) throw new NotFoundException("Employee not found");

    const current = await this.salaryService.salaryProfile(companyId, employeeId);
    const blank = this.salaryService.buildBlankSalaryPayload(employeeId);
    const base = current ?? {
      ...blank,
      id: `sal_draft_${employeeId}`,
      allowances: blank.allowances!,
      deductions: blank.deductions!,
      history: [],
      incrementHistory: [],
      joiningDate: dateOnly(emp.joinDate),
      effectiveFrom: dateOnly(emp.joinDate),
      salaryGrade: "G3",
      salaryType: "monthly",
      payrollGroup: "standard",
      currency: "EGP",
      bankAccount: "",
      iban: "",
      paymentMethod: "bank_transfer",
      insuranceStatus: "insured",
      taxStatus: "resident",
      contractType: "full_time",
      bonuses: 0,
      commission: 0,
      incentives: 0,
      manualAdjustments: 0,
      basicSalary: 0,
    };

    const nextBasic =
      body.basicSalary !== undefined
        ? Math.max(0, Number(body.basicSalary))
        : Number(base.basicSalary ?? 0);

    const allowancesIn = (body.allowances ?? {}) as Record<string, number>;
    const deductionsIn = (body.deductions ?? {}) as Record<string, number>;

    const history = Array.isArray(base.history) ? [...base.history] : [];
    if (current && nextBasic !== current.basicSalary) {
      history.unshift({
        id: `salh_${Date.now()}`,
        effectiveFrom: new Date().toISOString().slice(0, 10),
        basicSalary: nextBasic,
        note: String(body.historyNote ?? `Admin salary update by ${actorId}`),
      });
    }

    const payload: SalaryPayload = {
      basicSalary: nextBasic,
      allowances: {
        housing: Number(allowancesIn.housing ?? base.allowances.housing ?? 0),
        transportation: Number(
          allowancesIn.transportation ?? base.allowances.transportation ?? 0
        ),
        meal: Number(allowancesIn.meal ?? base.allowances.meal ?? 0),
        phone: Number(allowancesIn.phone ?? base.allowances.phone ?? 0),
        other: Number(allowancesIn.other ?? base.allowances.other ?? 0),
        shift: Number(allowancesIn.shift ?? base.allowances.shift ?? 0),
      },
      bonuses: Number(body.bonuses ?? base.bonuses ?? 0),
      commission: Number(body.commission ?? base.commission ?? 0),
      incentives: Number(body.incentives ?? base.incentives ?? 0),
      manualAdjustments: Number(
        body.manualAdjustments ?? base.manualAdjustments ?? 0
      ),
      deductions: {
        insurance: Number(
          deductionsIn.insurance ?? base.deductions.insurance ?? 0
        ),
        tax: Number(deductionsIn.tax ?? base.deductions.tax ?? 0),
        loan: Number(deductionsIn.loan ?? base.deductions.loan ?? 0),
        advances: Number(
          deductionsIn.advances ?? base.deductions.advances ?? 0
        ),
        recurring: Number(
          deductionsIn.recurring ?? base.deductions.recurring ?? 0
        ),
        penalties: Number(
          deductionsIn.penalties ?? base.deductions.penalties ?? 0
        ),
      },
      currency: String(body.currency ?? base.currency ?? "EGP"),
      salaryType: String(body.salaryType ?? base.salaryType ?? "monthly"),
      salaryGrade: String(body.salaryGrade ?? base.salaryGrade ?? "G3"),
      payrollGroup: String(
        body.payrollGroup ?? base.payrollGroup ?? "standard"
      ),
      paymentMethod: String(
        body.paymentMethod ?? base.paymentMethod ?? "bank_transfer"
      ),
      insuranceStatus: String(
        body.insuranceStatus ?? base.insuranceStatus ?? "insured"
      ),
      taxStatus: String(body.taxStatus ?? base.taxStatus ?? "resident"),
      contractType: String(
        body.contractType ?? base.contractType ?? "full_time"
      ),
      bankAccount: String(body.bankAccount ?? base.bankAccount ?? ""),
      iban: String(body.iban ?? base.iban ?? ""),
      joiningDate: String(body.joiningDate ?? base.joiningDate),
      effectiveFrom: String(
        body.effectiveFrom ?? new Date().toISOString().slice(0, 10)
      ),
      history,
      incrementHistory: Array.isArray(base.incrementHistory)
        ? base.incrementHistory
        : [],
    };

    await this.prisma.employeeSalaryProfile.upsert({
      where: { companyId_employeeId: { companyId, employeeId } },
      create: {
        companyId,
        employeeId,
        payload: payload as unknown as Prisma.InputJsonValue,
      },
      update: {
        payload: payload as unknown as Prisma.InputJsonValue,
        version: { increment: 1 },
      },
    });

    return this.salaryService.salaryProfile(companyId, employeeId);
  }
}
