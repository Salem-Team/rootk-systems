import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { dateOnly } from "../../common/mappers";
import type { SalaryPayload } from "../payroll.types";

/** Employee salary profile read model. */
@Injectable()
export class PayrollSalaryService {
  constructor(private readonly prisma: PrismaService) {}

  buildBlankSalaryPayload(employeeId: string): SalaryPayload {
    void employeeId;
    return {
      basicSalary: 0,
      allowances: {
        housing: 0,
        transportation: 0,
        meal: 0,
        phone: 0,
        other: 0,
        shift: 0,
      },
      bonuses: 0,
      commission: 0,
      incentives: 0,
      manualAdjustments: 0,
      deductions: {
        insurance: 0,
        tax: 0,
        loan: 0,
        advances: 0,
        recurring: 0,
        penalties: 0,
      },
      currency: "EGP",
      salaryType: "monthly",
      salaryGrade: "G3",
      payrollGroup: "standard",
      paymentMethod: "bank_transfer",
      insuranceStatus: "insured",
      taxStatus: "resident",
      contractType: "full_time",
      bankAccount: "",
      iban: "",
      history: [],
      incrementHistory: [],
    };
  }

  /** Read-only salary payload — never invents DB rows on GET. */
  async findSalary(
    companyId: string,
    employeeId: string
  ): Promise<(SalaryPayload & { id: string }) | null> {
    const row = await this.prisma.employeeSalaryProfile.findUnique({
      where: { companyId_employeeId: { companyId, employeeId } },
    });
    if (!row) return null;
    const payload = row.payload as SalaryPayload;
    return { id: row.id, ...payload };
  }

  async listSalaryProfiles(companyId: string) {
    const employees = await this.prisma.employee.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { name: "asc" },
    });
    const out = [];
    for (const emp of employees) {
      const profile = await this.salaryProfile(companyId, emp.id);
      if (!profile) continue;
      out.push({
        ...profile,
        employeeName: emp.name,
        department: emp.department,
        position: emp.position,
        employeeCode: emp.employeeCode,
        status: emp.status,
      });
    }
    return out;
  }

  async salaryProfile(companyId: string, employeeId: string) {
    const existing = await this.findSalary(companyId, employeeId);
    if (!existing) return null;

    const emp = await this.prisma.employee.findFirst({
      where: { id: employeeId, companyId, deletedAt: null },
    });
    const basic = existing.basicSalary ?? 0;
    const allowances = {
      housing: existing.allowances?.housing ?? 0,
      transportation: existing.allowances?.transportation ?? 0,
      meal: existing.allowances?.meal ?? 0,
      phone: existing.allowances?.phone ?? 0,
      other: existing.allowances?.other ?? 0,
      shift: existing.allowances?.shift ?? 0,
    };
    const deductionsRaw = (existing.deductions ?? {}) as Record<string, number>;
    const joiningDate = emp
      ? dateOnly(emp.joinDate)
      : new Date().toISOString().slice(0, 10);
    return {
      id: existing.id,
      employeeId,
      companyId,
      basicSalary: basic,
      allowances,
      bonuses: existing.bonuses ?? 0,
      commission: existing.commission ?? 0,
      incentives: Number(existing.incentives ?? 0),
      manualAdjustments: Number(existing.manualAdjustments ?? 0),
      deductions: {
        insurance: deductionsRaw.insurance ?? 0,
        tax: deductionsRaw.tax ?? 0,
        loan: deductionsRaw.loan ?? 0,
        advances: deductionsRaw.advances ?? 0,
        recurring: deductionsRaw.recurring ?? 0,
        penalties: deductionsRaw.penalties ?? 0,
      },
      salaryGrade: existing.salaryGrade ?? "G3",
      salaryType: existing.salaryType ?? "monthly",
      payrollGroup:
        existing.payrollGroup === "default"
          ? "standard"
          : (existing.payrollGroup ?? "standard"),
      currency: existing.currency ?? "EGP",
      bankAccount: String(existing.bankAccount ?? ""),
      iban: String(existing.iban ?? ""),
      paymentMethod:
        existing.paymentMethod === "bank"
          ? "bank_transfer"
          : (existing.paymentMethod ?? "bank_transfer"),
      insuranceStatus: existing.insuranceStatus ?? "insured",
      taxStatus:
        existing.taxStatus === "taxable"
          ? "resident"
          : (existing.taxStatus ?? "resident"),
      contractType: existing.contractType ?? "full_time",
      joiningDate,
      effectiveFrom: String(existing.effectiveFrom ?? joiningDate),
      history: Array.isArray(existing.history) ? existing.history : [],
      incrementHistory: Array.isArray(existing.incrementHistory)
        ? existing.incrementHistory
        : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "system",
      updatedBy: "system",
      deletedAt: null,
      isArchived: false,
      version: 1,
      metadata: { persisted: true },
    };
  }
}
