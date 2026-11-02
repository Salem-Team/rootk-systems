import { Injectable } from "@nestjs/common";
import { PayrollPoliciesService } from "./services/payroll-policies.service";
import { PayrollSalaryService } from "./services/payroll-salary.service";
import { PayrollSalaryUpdateService } from "./services/payroll-salary-update.service";
import { PayrollPayslipQueryService } from "./services/payroll-payslip-query.service";
import { PayrollRunsService } from "./services/payroll-runs.service";
import { PayrollDashboardService } from "./services/payroll-dashboard.service";
import { PayrollPeriodService } from "./services/payroll-period.service";

/**
 * Public payroll API facade — delegates to focused domain services.
 * Keep this as the only import surface for PayrollController and other modules.
 */
@Injectable()
export class PayrollService {
  constructor(
    private readonly policiesService: PayrollPoliciesService,
    private readonly salaryService: PayrollSalaryService,
    private readonly salaryUpdateService: PayrollSalaryUpdateService,
    private readonly payslipQueryService: PayrollPayslipQueryService,
    private readonly runsService: PayrollRunsService,
    private readonly dashboardService: PayrollDashboardService,
    private readonly periodService: PayrollPeriodService
  ) {}

  policies(companyId: string) {
    return this.policiesService.policies(companyId);
  }

  patchPolicies(companyId: string, body: Record<string, unknown>) {
    return this.policiesService.patchPolicies(companyId, body);
  }

  rules(companyId: string) {
    return this.policiesService.rules(companyId);
  }

  toggleRule(companyId: string, id: string, enabled: boolean) {
    return this.policiesService.toggleRule(companyId, id, enabled);
  }

  advance(companyId: string, actorId = "system") {
    return this.runsService.advance(companyId, actorId);
  }

  cancel(companyId: string, actorId = "system") {
    return this.runsService.cancel(companyId, actorId);
  }

  listRuns(companyId: string) {
    return this.runsService.listRuns(companyId);
  }

  dashboard(companyId: string) {
    return this.dashboardService.dashboard(companyId);
  }

  reports(companyId: string) {
    return this.dashboardService.reports(companyId);
  }

  payslips(companyId: string, employeeId?: string) {
    return this.payslipQueryService.payslips(companyId, employeeId);
  }

  payslip(companyId: string, employeeId: string) {
    return this.payslipQueryService.payslip(companyId, employeeId);
  }

  history(companyId: string, employeeId: string) {
    return this.payslipQueryService.history(companyId, employeeId);
  }

  listPeriods(companyId: string) {
    return this.periodService.listPeriods(companyId);
  }

  previewPeriod(companyId: string, periodId: string) {
    return this.periodService.preview(companyId, periodId);
  }

  calculatePeriod(companyId: string, periodId: string, actorId = "system") {
    return this.periodService.calculate(companyId, periodId, actorId);
  }

  listSalaryProfiles(companyId: string) {
    return this.salaryService.listSalaryProfiles(companyId);
  }

  salaryProfile(companyId: string, employeeId: string) {
    return this.salaryService.salaryProfile(companyId, employeeId);
  }

  patchSalaryProfile(
    companyId: string,
    employeeId: string,
    body: Record<string, unknown>,
    actorId: string
  ) {
    return this.salaryUpdateService.patchSalaryProfile(
      companyId,
      employeeId,
      body,
      actorId
    );
  }
}
