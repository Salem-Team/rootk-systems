import { api } from "@/api/http";
import { API_ROUTES, toQuery } from "@/api/routes";
import type { ApiResponse } from "@/types";
import type {
  EmployeePayslip,
  EmployeeSalaryProfile,
  PayrollDashboardSummary,
  PayrollPolicies,
  PayrollReportBundle,
  PayrollRule,
  PayrollRun,
  PayslipHistoryItem,
} from "@/types/payroll";

const EMPTY_DASHBOARD: PayrollDashboardSummary = {
  period: {
    id: "",
    label: "",
    year: 0,
    month: 0,
    startDate: "",
    endDate: "",
    payDate: "",
    workingDays: 0,
    cycle: "monthly",
    paymentDay: 1,
  },
  run: {
    id: "",
    companyId: "",
    periodId: "",
    status: "draft",
    employeeCount: 0,
    estimatedCost: 0,
    totalDeductions: 0,
    totalOvertime: 0,
    netPayroll: 0,
    averageSalary: 0,
    employerCostTotal: 0,
    pendingCount: 0,
    createdAt: "",
    updatedAt: "",
    createdBy: "",
    updatedBy: "",
    deletedAt: null,
    isArchived: false,
    version: 1,
    metadata: {},
  },
  upcomingPayDate: "",
  employeesIncluded: 0,
  pendingPayroll: 0,
  estimatedCost: 0,
  totalDeductions: 0,
  totalOvertime: 0,
  netPayroll: 0,
  averageSalary: 0,
  employeesProcessed: 0,
  timeline: [],
  calendar: [],
};

/** GET /payroll/dashboard */
export function fetchPayrollDashboard(): Promise<
  ApiResponse<PayrollDashboardSummary>
> {
  return api.get(API_ROUTES.payroll.dashboard, EMPTY_DASHBOARD);
}

/** GET /payroll/salary-profiles/:employeeId */
export function fetchSalaryProfile(
  employeeId: string
): Promise<ApiResponse<EmployeeSalaryProfile | null>> {
  return api.get(API_ROUTES.payroll.salaryProfile(employeeId), null);
}

/** GET /payroll/payslips/:employeeId */
export function fetchEmployeePayslip(
  employeeId: string
): Promise<ApiResponse<EmployeePayslip | null>> {
  return api.get(API_ROUTES.payroll.payslipByEmployee(employeeId), null);
}

/** GET /payroll/payslips/:employeeId/history */
export function fetchPayslipHistory(
  employeeId: string
): Promise<ApiResponse<PayslipHistoryItem[]>> {
  return api.getList(API_ROUTES.payroll.payslipHistory(employeeId));
}

/** GET /payroll/payslips */
export function fetchAllPayslips(): Promise<ApiResponse<EmployeePayslip[]>> {
  return api.getList(API_ROUTES.payroll.payslips);
}

/** GET /payroll/policies */
export function fetchPayrollPolicies(): Promise<ApiResponse<PayrollPolicies>> {
  return api.get(API_ROUTES.payroll.policies, {} as PayrollPolicies);
}

/** PATCH /payroll/policies */
export function patchPayrollPolicies(
  patch: Partial<PayrollPolicies>
): Promise<ApiResponse<PayrollPolicies>> {
  return api.patch(API_ROUTES.payroll.policies, patch, {} as PayrollPolicies);
}

/** GET /payroll/rules */
export function fetchPayrollRules(): Promise<ApiResponse<PayrollRule[]>> {
  return api.getList(API_ROUTES.payroll.rules);
}

/** PATCH /payroll/rules/:id/toggle */
export function patchPayrollRuleToggle(
  id: string,
  enabled: boolean
): Promise<ApiResponse<PayrollRule[]>> {
  return api.patch(API_ROUTES.payroll.ruleToggle(id), { enabled }, []);
}

/** POST /payroll/runs/advance */
export function postPayrollRunAdvance(): Promise<ApiResponse<PayrollRun>> {
  return api.post(API_ROUTES.payroll.runAdvance, {}, {} as PayrollRun);
}

/** GET /payroll/reports */
export function fetchPayrollReports(
  params: { periodId?: string } = {}
): Promise<ApiResponse<PayrollReportBundle>> {
  return api.get(
    `${API_ROUTES.payroll.reports}${toQuery(params)}`,
    {} as PayrollReportBundle
  );
}
