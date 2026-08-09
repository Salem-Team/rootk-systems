/**
 * Barrel — keep this the only import surface for payroll UI/services.
 * Implementation lives in `@/services/payroll/*`; split for maintainability.
 */
export { ensureSalaryProfileForEmployee, resetPayrollMemory } from "@/services/payroll/state";
export {
  getPayrollDashboard,
  getSalaryProfile,
  listSalaryProfiles,
  listPayrollRuns,
  getEmployeePayslip,
  getPayslipHistory,
  getAllPayslips,
  getPayrollPolicies,
  getPayrollRules,
} from "@/services/payroll/queries";
export { getPayrollReports } from "@/services/payroll/reports";
export {
  updateSalaryProfile,
  updatePayrollPolicies,
  togglePayrollRule,
  advancePayrollStatus,
  cancelPayrollRun,
} from "@/services/payroll/mutations";
export {
  personaForRole,
  canViewAllPayroll,
  canEditPolicies,
  canApproveFinance,
} from "@/services/payroll/persona";
