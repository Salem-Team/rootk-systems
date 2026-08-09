"use client";

import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PayrollKpiRow } from "@/components/payroll/payroll-kpi-row";
import { PayrollTimeline } from "@/components/payroll/payroll-timeline";
import { PayrollPoliciesPanel } from "@/components/payroll/payroll-policies-panel";
import { PayrollRulesEngine } from "@/components/payroll/payroll-rules-engine";
import { PayrollApprovalWorkflow } from "@/components/payroll/payroll-approval-workflow";
import { PayrollReportsPanel } from "@/components/payroll/payroll-reports-panel";
import { PayrollLedgerPanel } from "@/components/payroll/payroll-ledger-panel";
import { PayslipStatementView } from "@/components/payroll/payslip-statement";
import { PayrollSalaryTab } from "@/components/payroll/payroll-salary-tab";
import { SalaryProfileEditorSheet } from "@/components/payroll/salary-profile-editor-sheet";
import { formatEgp } from "@/lib/payroll";
import {
  canApproveFinance,
  canEditPolicies,
  canViewAllPayroll,
  getAllPayslips,
  getPayrollDashboard,
} from "@/services/payroll.service";
import { useTranslation } from "@/hooks/use-translation";
import type { Employee } from "@/types";
import type {
  EmployeePayslip,
  EmployeeSalaryProfile,
  PayrollDashboardSummary,
  PayrollPersona,
  PayrollPolicies,
  PayrollReportBundle,
  PayrollRule,
  PayrollRun,
} from "@/types/payroll";
import { EmployeePicker, ImpactLists } from "./payroll-workspace-shared";

export function PayrollAdminView({
  persona,
  onPersonaChange,
  summary,
  onSummaryChange,
  policies,
  onPoliciesChange,
  rules,
  onRulesChange,
  reports,
  employees,
  payslips,
  onPayslipsChange,
  selectedEmployeeId,
  onSelectedEmployeeIdChange,
  selectedPayslip,
  selectedEmployee,
  selectedProfileState,
  onSelectedProfileStateChange,
  tab,
  onTabChange,
  editProfileOpen,
  onEditProfileOpenChange,
  onRefreshPayrollCalculations,
  locale,
}: {
  persona: PayrollPersona;
  onPersonaChange: (persona: PayrollPersona) => void;
  summary: PayrollDashboardSummary;
  onSummaryChange: (updater: (s: PayrollDashboardSummary | null) => PayrollDashboardSummary | null) => void;
  policies: PayrollPolicies;
  onPoliciesChange: (policies: PayrollPolicies) => void;
  rules: PayrollRule[];
  onRulesChange: (rules: PayrollRule[]) => void;
  reports: PayrollReportBundle;
  employees: Employee[];
  payslips: EmployeePayslip[];
  onPayslipsChange: (payslips: EmployeePayslip[]) => void;
  selectedEmployeeId: string;
  onSelectedEmployeeIdChange: (id: string) => void;
  selectedPayslip: EmployeePayslip | null;
  selectedEmployee: Employee | null;
  selectedProfileState: EmployeeSalaryProfile | null;
  onSelectedProfileStateChange: (profile: EmployeeSalaryProfile | null) => void;
  tab: string;
  onTabChange: (tab: string) => void;
  editProfileOpen: boolean;
  onEditProfileOpenChange: (open: boolean) => void;
  onRefreshPayrollCalculations: () => void | Promise<void>;
  locale: string;
}) {
  const { t } = useTranslation();
  const viewAll = canViewAllPayroll(persona);

  function refreshPayslipsAndSummary() {
    void getAllPayslips().then((res) => {
      if (res.success) onPayslipsChange(res.data);
    });
    void getPayrollDashboard().then((res) => {
      if (res.success) onSummaryChange(() => res.data);
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("payroll.eyebrow")}
        title={t("payroll.title")}
        description={t("payroll.description")}
        actions={
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("payroll.personaLabel")}>
            {(["admin", "hr", "finance", "manager"] as PayrollPersona[]).map(
              (p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPersonaChange(p)}
                  className="focus-ring rounded-md"
                >
                  <Badge variant={persona === p ? "default" : "outline"}>
                    {t(`payroll.persona.${p}`)}
                  </Badge>
                </button>
              )
            )}
          </div>
        }
      />

      <PayrollKpiRow summary={summary} />

      <Tabs value={tab} onValueChange={onTabChange}>
        <TabsList className="flex h-auto w-full flex-nowrap justify-start gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap">
          <TabsTrigger value="overview" className="shrink-0">
            {t("payroll.tabOverview")}
          </TabsTrigger>
          <TabsTrigger value="ledger" className="shrink-0">
            {t("payroll.tabLedger")}
          </TabsTrigger>
          <TabsTrigger value="salary" className="shrink-0">
            {t("payroll.tabSalary")}
          </TabsTrigger>
          <TabsTrigger value="policies" className="shrink-0">
            {t("payroll.tabPolicies")}
          </TabsTrigger>
          <TabsTrigger value="rules" className="shrink-0">
            {t("payroll.tabRules")}
          </TabsTrigger>
          <TabsTrigger value="workflow" className="shrink-0">
            {t("payroll.tabWorkflow")}
          </TabsTrigger>
          <TabsTrigger value="reports" className="shrink-0">
            {t("payroll.tabReports")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid gap-4 xl:grid-cols-5">
            <div className="xl:col-span-3">
              <PayrollApprovalWorkflow
                run={summary.run}
                canAdvance={
                  canApproveFinance(persona) ||
                  persona === "hr" ||
                  persona === "admin"
                }
                onAdvanced={(run: PayrollRun) =>
                  onSummaryChange((s) => (s ? { ...s, run } : s))
                }
              />
            </div>
            <div className="xl:col-span-2">
              <PayrollTimeline events={summary.timeline} />
            </div>
          </div>
          {viewAll && selectedPayslip ? (
            <div className="space-y-3">
              <EmployeePicker
                employees={employees}
                payslips={payslips}
                value={selectedEmployeeId}
                onChange={onSelectedEmployeeIdChange}
              />
              <PayslipStatementView
                payslip={selectedPayslip}
                profile={selectedProfileState}
                employee={selectedEmployee}
                periodLabel={summary.period.label}
              />
              <ImpactLists payslip={selectedPayslip} />
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="ledger" className="mt-4 space-y-4">
          <PayrollLedgerPanel
            summary={summary}
            payslips={payslips}
            employees={employees}
            canAdvance={
              canApproveFinance(persona) ||
              persona === "hr" ||
              persona === "admin"
            }
            onRunUpdated={(run) =>
              onSummaryChange((s) => (s ? { ...s, run } : s))
            }
            onRefreshPayslips={refreshPayslipsAndSummary}
          />
        </TabsContent>

        <TabsContent value="salary" className="mt-4 space-y-4">
          <PayrollSalaryTab
            persona={persona}
            employees={employees}
            payslips={payslips}
            selectedEmployeeId={selectedEmployeeId}
            onSelectedEmployeeIdChange={onSelectedEmployeeIdChange}
            selectedProfileState={selectedProfileState}
            selectedPayslip={selectedPayslip}
            selectedEmployee={selectedEmployee}
            periodLabel={summary.period.label}
            onEditProfile={() => onEditProfileOpenChange(true)}
          />
        </TabsContent>

        <TabsContent value="policies" className="mt-4">
          <PayrollPoliciesPanel
            policies={policies}
            editable={canEditPolicies(persona)}
            onChange={(next) => {
              onPoliciesChange(next);
              void onRefreshPayrollCalculations();
            }}
          />
        </TabsContent>

        <TabsContent value="rules" className="mt-4">
          <PayrollRulesEngine
            rules={rules}
            editable={canEditPolicies(persona)}
            onChange={(next) => {
              onRulesChange(next);
              void onRefreshPayrollCalculations();
            }}
          />
        </TabsContent>

        <TabsContent value="workflow" className="mt-4 space-y-4">
          <PayrollApprovalWorkflow
            run={summary.run}
            canAdvance={
              canApproveFinance(persona) ||
              persona === "hr" ||
              persona === "admin"
            }
            onAdvanced={(run) => onSummaryChange((s) => (s ? { ...s, run } : s))}
          />
          <PayrollTimeline events={summary.timeline} />
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <PayrollReportsPanel reports={reports} />
        </TabsContent>
      </Tabs>

      <SalaryProfileEditorSheet
        open={editProfileOpen}
        onOpenChange={onEditProfileOpenChange}
        profile={selectedProfileState}
        employeeId={selectedEmployeeId}
        employeeLabel={
          employees.find((e) => e.id === selectedEmployeeId)?.name
        }
        onSaved={(profile) => {
          onSelectedProfileStateChange(profile);
          refreshPayslipsAndSummary();
        }}
      />

      <p className="sr-only">
        {locale} {formatEgp(summary.netPayroll, locale === "ar" ? "ar" : "en")}
      </p>
    </div>
  );
}
