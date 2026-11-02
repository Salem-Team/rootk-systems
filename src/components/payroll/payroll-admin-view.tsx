"use client";

import dynamic from "next/dynamic";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { PayrollKpiRow } from "@/components/payroll/payroll-kpi-row";
import { formatEgp } from "@/lib/payroll";
import {
  calculatePayrollPeriod,
  canApproveFinance,
  canEditPolicies,
  canViewAllPayroll,
  getAllPayslips,
  getPayrollDashboard,
  getPayrollPeriodPreview,
} from "@/services/payroll.service";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
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

const panelLoading = () => <Skeleton className="h-56 w-full rounded-xl" />;

const PayrollTimeline = dynamic(
  () =>
    import("@/components/payroll/payroll-timeline").then(
      (m) => m.PayrollTimeline
    ),
  { loading: panelLoading }
);
const PayrollPoliciesPanel = dynamic(
  () =>
    import("@/components/payroll/payroll-policies-panel").then(
      (m) => m.PayrollPoliciesPanel
    ),
  { loading: panelLoading }
);
const PayrollRulesEngine = dynamic(
  () =>
    import("@/components/payroll/payroll-rules-engine").then(
      (m) => m.PayrollRulesEngine
    ),
  { loading: panelLoading }
);
const PayrollApprovalWorkflow = dynamic(
  () =>
    import("@/components/payroll/payroll-approval-workflow").then(
      (m) => m.PayrollApprovalWorkflow
    ),
  { loading: panelLoading }
);
const PayrollReportsPanel = dynamic(
  () =>
    import("@/components/payroll/payroll-reports-panel").then(
      (m) => m.PayrollReportsPanel
    ),
  { ssr: false, loading: panelLoading }
);
const PayrollLedgerPanel = dynamic(
  () =>
    import("@/components/payroll/payroll-ledger-panel").then(
      (m) => m.PayrollLedgerPanel
    ),
  { loading: panelLoading }
);
const PayslipStatementView = dynamic(
  () =>
    import("@/components/payroll/payslip-statement").then(
      (m) => m.PayslipStatementView
    ),
  { loading: panelLoading }
);
const PayrollSalaryTab = dynamic(
  () =>
    import("@/components/payroll/payroll-salary-tab").then(
      (m) => m.PayrollSalaryTab
    ),
  { loading: panelLoading }
);
const SalaryProfileEditorSheet = dynamic(
  () =>
    import("@/components/payroll/salary-profile-editor-sheet").then(
      (m) => m.SalaryProfileEditorSheet
    ),
  { ssr: false }
);

const TAB_ITEMS = [
  { value: "salary", labelKey: "payroll.tabSalary" as const },
  { value: "ledger", labelKey: "payroll.tabMonthBoard" as const },
  { value: "overview", labelKey: "payroll.tabOverview" as const },
  { value: "reports", labelKey: "payroll.tabReports" as const },
  { value: "policies", labelKey: "payroll.tabPolicies" as const },
  { value: "rules", labelKey: "payroll.tabRules" as const },
  { value: "workflow", labelKey: "payroll.tabWorkflow" as const },
];

export function PayrollAdminView({
  persona = "admin",
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
  periodId,
  onPeriodIdChange,
  periodReloadNonce,
  onPeriodReload,
  locale,
}: {
  persona?: PayrollPersona;
  summary: PayrollDashboardSummary;
  onSummaryChange: (
    updater: (s: PayrollDashboardSummary | null) => PayrollDashboardSummary | null
  ) => void;
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
  periodId: string;
  onPeriodIdChange: (periodId: string) => void;
  periodReloadNonce: number;
  onPeriodReload: () => void;
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

  async function refreshAfterSalarySave() {
    const calc = await calculatePayrollPeriod(periodId);
    if (calc.success && calc.data) {
      onPayslipsChange(calc.data.payslips);
      onPeriodReload();
      void getPayrollDashboard().then((res) => {
        if (res.success) onSummaryChange(() => res.data);
      });
      toast.success(t("payroll.salaryRecalcDone"));
      return;
    }
    const preview = await getPayrollPeriodPreview(periodId);
    if (preview.success && preview.data) {
      onPayslipsChange(preview.data.payslips);
      onPeriodReload();
    } else {
      refreshPayslipsAndSummary();
      onPeriodReload();
    }
    if (!calc.success) {
      toast.message(calc.message ?? t("payroll.salarySavedPreviewOnly"));
    }
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <PageHeader
        title={t("payroll.title")}
        showBreadcrumbs={false}
        className="!mb-2 sm:!mb-3"
      />

      <Tabs value={tab} onValueChange={onTabChange} className="space-y-3">
        <div className="payroll-sticky-tabs sticky top-[var(--chrome-sticky-top)] z-20 -mx-3 border-b border-border/60 bg-background/95 px-3 py-2 backdrop-blur-xl sm:-mx-4 sm:px-4">
          <TabsList
            className={cn(
              "flex h-auto w-full max-w-full flex-nowrap items-stretch justify-start gap-1 overflow-x-auto overscroll-x-contain rounded-xl border border-border/70 bg-muted/50 p-1",
              "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
              "sm:flex-wrap sm:overflow-visible"
            )}
          >
            {TAB_ITEMS.map((item) => (
              <TabsTrigger
                key={item.value}
                value={item.value}
                className="min-h-10 shrink-0 touch-manipulation px-3 text-[12px] sm:min-h-9 sm:text-[13px]"
              >
                {t(item.labelKey)}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="salary" className="mt-0 space-y-3 focus-visible:ring-0">
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
            profileReloadNonce={periodReloadNonce}
          />
        </TabsContent>

        <TabsContent value="ledger" className="mt-0 space-y-3 focus-visible:ring-0">
          <PayrollLedgerPanel
            summary={summary}
            payslips={payslips}
            employees={employees}
            periodId={periodId}
            onPeriodIdChange={onPeriodIdChange}
            periodReloadNonce={periodReloadNonce}
            selectedEmployeeId={selectedEmployeeId}
            onSelectedEmployeeIdChange={onSelectedEmployeeIdChange}
            onPayslipsChange={onPayslipsChange}
            onEditSalary={(employeeId) => {
              onSelectedEmployeeIdChange(employeeId);
              onEditProfileOpenChange(true);
            }}
            canAdvance={
              canApproveFinance(persona) ||
              persona === "hr" ||
              persona === "admin"
            }
            canCalculate={
              persona === "admin" || persona === "hr" || persona === "finance"
            }
            canEditSalary={
              persona === "admin" || persona === "hr" || persona === "finance"
            }
            onRunUpdated={(run) =>
              onSummaryChange((s) => (s ? { ...s, run } : s))
            }
            onRefreshPayslips={refreshPayslipsAndSummary}
          />
        </TabsContent>

        <TabsContent value="overview" className="mt-0 space-y-3 focus-visible:ring-0">
          <PayrollKpiRow summary={summary} compact />
          <div className="grid gap-3 xl:grid-cols-5">
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

        <TabsContent value="reports" className="mt-0 focus-visible:ring-0">
          <PayrollReportsPanel reports={reports} />
        </TabsContent>

        <TabsContent value="policies" className="mt-0 focus-visible:ring-0">
          <PayrollPoliciesPanel
            policies={policies}
            editable={canEditPolicies(persona)}
            onChange={(next) => {
              onPoliciesChange(next);
              void onRefreshPayrollCalculations();
            }}
          />
        </TabsContent>

        <TabsContent value="rules" className="mt-0 focus-visible:ring-0">
          <PayrollRulesEngine
            rules={rules}
            editable={canEditPolicies(persona)}
            onChange={(next) => {
              onRulesChange(next);
              void onRefreshPayrollCalculations();
            }}
          />
        </TabsContent>

        <TabsContent value="workflow" className="mt-0 space-y-3 focus-visible:ring-0">
          <PayrollApprovalWorkflow
            run={summary.run}
            canAdvance={
              canApproveFinance(persona) ||
              persona === "hr" ||
              persona === "admin"
            }
            onAdvanced={(run) =>
              onSummaryChange((s) => (s ? { ...s, run } : s))
            }
          />
          <PayrollTimeline events={summary.timeline} />
        </TabsContent>
      </Tabs>

      {editProfileOpen ? (
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
            void refreshAfterSalarySave();
          }}
        />
      ) : null}

      <p className="sr-only">
        {locale} {formatEgp(summary.netPayroll, locale === "ar" ? "ar" : "en")}
      </p>
    </div>
  );
}
