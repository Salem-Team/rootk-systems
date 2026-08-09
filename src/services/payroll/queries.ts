import { AppRole } from "@/constants/roles";
import { isApiMode } from "@/lib/env";
import {
  fetchAllPayslips,
  fetchEmployeePayslip,
  fetchPayrollDashboard,
  fetchPayrollPolicies,
  fetchPayrollRules,
  fetchPayrollRuns,
  fetchPayslipHistory,
  fetchSalaryProfile,
  fetchSalaryProfiles,
} from "@/api/payroll.api";
import { PAYROLL_PERIOD, mockPayslipHistory, payrollCalendarSeed, payrollTimelineSeed } from "@/mocks/payroll";
import { employeeRepository } from "@/repositories";
import { ForbiddenError } from "@/lib/errors";
import { fromError, ok } from "@/services/api-result";
import { simulateDelay } from "@/services/fake-api";
import { getSessionRole, getWorkEmployeeId } from "@/stores/session-store";
import type { ApiResponse } from "@/types";
import type {
  EmployeePayslip,
  EmployeeSalaryProfile,
  PayrollDashboardSummary,
  PayrollPolicies,
  PayrollRule,
  PayrollRun,
  PayslipHistoryItem,
} from "@/types/payroll";
import { aggregateRun, buildPayslips, emptyDashboard } from "./calculation";
import {
  ensurePayrollStateLoaded,
  getPoliciesState,
  getProfilesState,
  getRulesState,
  getRunStatus,
  hydratePolicies,
  syncCurrencyFromSettings,
} from "./state";

/** GET /payroll/dashboard */
export async function getPayrollDashboard(): Promise<
  ApiResponse<PayrollDashboardSummary>
> {
  if (isApiMode()) return fetchPayrollDashboard();
  try {
    await simulateDelay();
    const payslips = await buildPayslips();
    const run = aggregateRun(payslips);
    const runStatus = getRunStatus();
    const processed =
      runStatus === "paid" || runStatus === "approved"
        ? run.employeeCount
        : Math.max(run.employeeCount - run.pendingCount, 0);
    return ok({
      period: PAYROLL_PERIOD,
      run,
      upcomingPayDate: PAYROLL_PERIOD.payDate,
      employeesIncluded: run.employeeCount,
      pendingPayroll: run.pendingCount,
      estimatedCost: run.estimatedCost,
      totalDeductions: run.totalDeductions,
      totalOvertime: run.totalOvertime,
      netPayroll: run.netPayroll,
      averageSalary: run.averageSalary,
      employeesProcessed: processed,
      timeline: payrollTimelineSeed,
      calendar: payrollCalendarSeed,
    });
  } catch (error) {
    return fromError(error, emptyDashboard());
  }
}

/** GET /payroll/profiles/:employeeId */
export async function getSalaryProfile(
  employeeId: string
): Promise<ApiResponse<EmployeeSalaryProfile | null>> {
  if (isApiMode()) return fetchSalaryProfile(employeeId);
  try {
    const scopedId =
      getSessionRole() === AppRole.employee ? getWorkEmployeeId() : employeeId;
    await simulateDelay();
    await ensurePayrollStateLoaded();
    return ok(getProfilesState().find((p) => p.employeeId === scopedId) ?? null);
  } catch (error) {
    return fromError(error, null);
  }
}

/** GET /payroll/salary-profiles */
export async function listSalaryProfiles(): Promise<
  ApiResponse<
    (EmployeeSalaryProfile & {
      employeeName?: string;
      department?: string;
      position?: string;
      employeeCode?: string;
      status?: string;
    })[]
  >
> {
  if (isApiMode()) return fetchSalaryProfiles();
  try {
    if (getSessionRole() !== AppRole.admin) {
      throw new ForbiddenError("Only admins can list salary profiles");
    }
    await simulateDelay();
    await ensurePayrollStateLoaded();
    const [profiles, employees] = await Promise.all([
      Promise.resolve(getProfilesState()),
      employeeRepository.list(),
    ]);
    return ok(
      profiles.map((p) => {
        const emp = employees.find((e) => e.id === p.employeeId);
        return {
          ...p,
          employeeName: emp?.name,
          department: emp?.department,
          position: emp?.position,
          employeeCode: emp?.employeeId,
          status: emp?.status,
        };
      })
    );
  } catch (error) {
    return fromError(error, []);
  }
}

/** GET /payroll/runs */
export async function listPayrollRuns(): Promise<ApiResponse<PayrollRun[]>> {
  if (isApiMode()) return fetchPayrollRuns();
  try {
    if (getSessionRole() !== AppRole.admin) {
      throw new ForbiddenError("Only admins can list payroll runs");
    }
    await simulateDelay();
    await ensurePayrollStateLoaded();
    const payslips = await buildPayslips();
    return ok([aggregateRun(payslips)]);
  } catch (error) {
    return fromError(error, []);
  }
}

/** GET /payroll/payslips/:employeeId */
export async function getEmployeePayslip(
  employeeId: string
): Promise<ApiResponse<EmployeePayslip | null>> {
  if (isApiMode()) return fetchEmployeePayslip(employeeId);
  try {
    const scopedId =
      getSessionRole() === AppRole.employee ? getWorkEmployeeId() : employeeId;
    await simulateDelay();
    const list = await buildPayslips(scopedId);
    return ok(list[0] ?? null);
  } catch (error) {
    return fromError(error, null);
  }
}

/** GET /payroll/payslips/:employeeId/history */
export async function getPayslipHistory(
  employeeId: string
): Promise<ApiResponse<PayslipHistoryItem[]>> {
  if (isApiMode()) return fetchPayslipHistory(employeeId);
  try {
    const scopedId =
      getSessionRole() === AppRole.employee ? getWorkEmployeeId() : employeeId;
    await simulateDelay();
    const current = await buildPayslips(scopedId);
    const runStatus = getRunStatus();
    const history = mockPayslipHistory(scopedId).map((item) => {
      if (item.periodId === PAYROLL_PERIOD.id && current[0]) {
        return {
          ...item,
          net: current[0].net,
          gross: current[0].gross,
          status: runStatus,
        };
      }
      return item;
    });
    return ok(history);
  } catch (error) {
    return fromError(error, []);
  }
}

/** GET /payroll/payslips */
export async function getAllPayslips(): Promise<ApiResponse<EmployeePayslip[]>> {
  if (isApiMode()) return fetchAllPayslips();
  try {
    if (getSessionRole() !== AppRole.admin) {
      throw new ForbiddenError("Only admins can list all payslips");
    }
    await simulateDelay();
    return ok(await buildPayslips());
  } catch (error) {
    return fromError(error, []);
  }
}

/** GET /payroll/policies */
export async function getPayrollPolicies(): Promise<ApiResponse<PayrollPolicies>> {
  if (isApiMode()) return fetchPayrollPolicies();
  try {
    await simulateDelay();
    await ensurePayrollStateLoaded();
    await syncCurrencyFromSettings();
    return ok(getPoliciesState());
  } catch (error) {
    return fromError(error, hydratePolicies());
  }
}

/** GET /payroll/rules */
export async function getPayrollRules(): Promise<ApiResponse<PayrollRule[]>> {
  if (isApiMode()) return fetchPayrollRules();
  try {
    await simulateDelay();
    await ensurePayrollStateLoaded();
    return ok(getRulesState());
  } catch (error) {
    return fromError(error, []);
  }
}
