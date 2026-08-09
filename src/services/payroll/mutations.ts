import { AppRole } from "@/constants/roles";
import { isApiMode } from "@/lib/env";
import { todayKey } from "@/lib/mock-date";
import {
  patchPayrollPolicies,
  patchPayrollRuleToggle,
  patchSalaryProfileRemote,
  postPayrollRunAdvance,
  postPayrollRunCancel,
} from "@/api/payroll.api";
import type { UpdateSalaryProfileInput } from "@/schemas/payroll.schema";
import { updateSalaryProfileSchema } from "@/schemas/payroll.schema";
import { scheduleRepository } from "@/repositories";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { fromError, ok } from "@/services/api-result";
import { simulateDelay } from "@/services/fake-api";
import { getSessionRole, getSessionUserId } from "@/stores/session-store";
import type { ApiResponse } from "@/types";
import type {
  EmployeeSalaryProfile,
  PayrollPolicies,
  PayrollRule,
  PayrollRun,
  PayrollRunStatus,
} from "@/types/payroll";
import { aggregateRun, buildPayslips } from "./calculation";
import {
  ensurePayrollStateLoaded,
  getPoliciesState,
  getProfilesState,
  getRulesState,
  getRunStatus,
  persistPayrollState,
  setPoliciesState,
  setProfilesState,
  setRulesState,
  setRunStatus,
} from "./state";

/** PATCH /payroll/salary-profiles/:employeeId */
export async function updateSalaryProfile(
  employeeId: string,
  input: UpdateSalaryProfileInput
): Promise<ApiResponse<EmployeeSalaryProfile | null>> {
  const parsed = updateSalaryProfileSchema.parse(input);
  if (isApiMode()) {
    return patchSalaryProfileRemote(employeeId, parsed);
  }
  try {
    if (getSessionRole() !== AppRole.admin) {
      throw new ForbiddenError("Only admins can edit salary profiles");
    }
    await simulateDelay();
    await ensurePayrollStateLoaded();
    const profiles = getProfilesState();
    const idx = profiles.findIndex((p) => p.employeeId === employeeId);
    if (idx < 0) throw new NotFoundError("Salary profile not found");
    const current = profiles[idx];
    const history = [...current.history];
    if (parsed.basicSalary !== current.basicSalary) {
      history.unshift({
        id: `salh_${Date.now()}`,
        effectiveFrom: todayKey(),
        basicSalary: parsed.basicSalary,
        note: parsed.historyNote ?? "Admin salary update",
      });
    }
    const next: EmployeeSalaryProfile = {
      ...current,
      basicSalary: parsed.basicSalary,
      allowances: parsed.allowances,
      bonuses: parsed.bonuses,
      commission: parsed.commission,
      incentives: parsed.incentives,
      manualAdjustments: parsed.manualAdjustments,
      deductions: parsed.deductions,
      salaryGrade: parsed.salaryGrade,
      salaryType: parsed.salaryType,
      payrollGroup: parsed.payrollGroup,
      currency: parsed.currency,
      bankAccount: parsed.bankAccount,
      iban: parsed.iban,
      paymentMethod: parsed.paymentMethod,
      insuranceStatus: parsed.insuranceStatus,
      taxStatus: parsed.taxStatus,
      contractType: parsed.contractType,
      history,
      updatedAt: new Date().toISOString(),
      updatedBy: getSessionUserId(),
      version: current.version + 1,
    };
    const nextProfiles = [...profiles];
    nextProfiles[idx] = next;
    setProfilesState(nextProfiles);
    await persistPayrollState();
    return ok(next, "Salary profile updated");
  } catch (error) {
    return fromError(error, null);
  }
}

/** PATCH /payroll/policies */
export async function updatePayrollPolicies(
  patch: Partial<PayrollPolicies>
): Promise<ApiResponse<PayrollPolicies>> {
  if (isApiMode()) return patchPayrollPolicies(patch);
  try {
    if (getSessionRole() !== AppRole.admin) {
      throw new ForbiddenError("Only admins can update payroll policies");
    }
    await simulateDelay();
    await ensurePayrollStateLoaded();
    const prevPolicies = getPoliciesState();
    const nextPolicies: PayrollPolicies = {
      ...prevPolicies,
      ...patch,
      late: {
        ...prevPolicies.late,
        ...(patch.late ?? {}),
        tiers: patch.late?.tiers ?? prevPolicies.late.tiers,
      },
      leaveBehavior: {
        ...prevPolicies.leaveBehavior,
        ...(patch.leaveBehavior ?? {}),
      },
      leavePayFraction: {
        ...prevPolicies.leavePayFraction,
        ...(patch.leavePayFraction ?? {}),
      },
      updatedAt: new Date().toISOString(),
      version: prevPolicies.version + 1,
    };
    setPoliciesState(nextPolicies);

    // Keep OT / night-shift rule amounts aligned with Policies (admin source of truth).
    const nextRules = getRulesState().map((r) => {
      if (r.when.field === "overtime_hours") {
        return {
          ...r,
          then: { ...r.then, amount: nextPolicies.overtimeRate },
          updatedAt: nextPolicies.updatedAt,
        };
      }
      if (r.when.field === "weekend_overtime") {
        return {
          ...r,
          then: { ...r.then, amount: nextPolicies.weekendOvertimeRate },
          updatedAt: nextPolicies.updatedAt,
        };
      }
      if (r.when.field === "holiday_overtime") {
        return {
          ...r,
          then: { ...r.then, amount: nextPolicies.holidayOvertimeRate },
          updatedAt: nextPolicies.updatedAt,
        };
      }
      if (r.when.field === "night_shift") {
        return {
          ...r,
          then: { ...r.then, amount: nextPolicies.nightShiftAllowance },
          updatedAt: nextPolicies.updatedAt,
        };
      }
      return r;
    });
    setRulesState(nextRules);

    // Sync attendance grace so late minutes use the admin value.
    if (
      typeof nextPolicies.late.graceMinutes === "number" &&
      Number.isFinite(nextPolicies.late.graceMinutes)
    ) {
      try {
        const schedule = await scheduleRepository.get();
        if (schedule.gracePeriodMinutes !== nextPolicies.late.graceMinutes) {
          await scheduleRepository.update({
            gracePeriodMinutes: nextPolicies.late.graceMinutes,
          });
        }
      } catch {
        /* best-effort — policies still save */
      }
    }

    await persistPayrollState();
    return ok(nextPolicies, "Payroll policies updated");
  } catch (error) {
    return fromError(error, getPoliciesState());
  }
}

/** PATCH /payroll/rules/:id */
export async function togglePayrollRule(
  id: string,
  enabled: boolean
): Promise<ApiResponse<PayrollRule[]>> {
  if (isApiMode()) return patchPayrollRuleToggle(id, enabled);
  try {
    if (getSessionRole() !== AppRole.admin) {
      throw new ForbiddenError("Only admins can toggle payroll rules");
    }
    await simulateDelay();
    await ensurePayrollStateLoaded();
    const nextRules = getRulesState().map((r) =>
      r.id === id
        ? { ...r, enabled, updatedAt: new Date().toISOString(), version: r.version + 1 }
        : r
    );
    setRulesState(nextRules);
    await persistPayrollState();
    return ok(nextRules, "Rule updated");
  } catch (error) {
    return fromError(error, getRulesState());
  }
}

/** POST /payroll/runs/advance */
export async function advancePayrollStatus(): Promise<ApiResponse<PayrollRun>> {
  if (isApiMode()) return postPayrollRunAdvance();
  try {
    if (getSessionRole() !== AppRole.admin) {
      throw new ForbiddenError("Only admins can advance payroll status");
    }
    await simulateDelay();
    await ensurePayrollStateLoaded();
    const order: PayrollRunStatus[] = [
      "draft",
      "hr_review",
      "finance_review",
      "approved",
      "paid",
    ];
    const idx = order.indexOf(getRunStatus());
    if (idx >= 0 && idx < order.length - 1) setRunStatus(order[idx + 1]);
    await persistPayrollState();
    const payslips = await buildPayslips();
    const run = aggregateRun(payslips);
    const { notifyPayrollAdvanced } = await import(
      "@/services/notification.service"
    );
    void notifyPayrollAdvanced({
      status: getRunStatus(),
      actorId: getSessionUserId(),
      runId: run.id,
    });
    return ok(run, `Payroll moved to ${getRunStatus()}`);
  } catch (error) {
    return fromError(error, aggregateRun([]));
  }
}

/** POST /payroll/runs/cancel — reset current period to draft and clear slips. */
export async function cancelPayrollRun(): Promise<ApiResponse<PayrollRun>> {
  if (isApiMode()) return postPayrollRunCancel();
  try {
    if (getSessionRole() !== AppRole.admin) {
      throw new ForbiddenError("Only admins can cancel payroll");
    }
    await simulateDelay();
    await ensurePayrollStateLoaded();
    setRunStatus("draft");
    await persistPayrollState();
    const run = aggregateRun([]);
    return ok(
      {
        ...run,
        status: "draft",
        netPayroll: 0,
        totalDeductions: 0,
        totalOvertime: 0,
        estimatedCost: 0,
        employerCostTotal: 0,
        averageSalary: 0,
        pendingCount: 0,
        employeeCount: 0,
      },
      "Payroll run cancelled"
    );
  } catch (error) {
    return fromError(error, aggregateRun([]));
  }
}
