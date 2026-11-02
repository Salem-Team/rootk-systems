"use client";

import { useMemo } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SalaryProfilePanel } from "@/components/payroll/salary-profile-panel";
import { PayslipHistoryPanel } from "@/components/payroll/payslip-history-panel";
import { PayslipStatementView } from "@/components/payroll/payslip-statement";
import { useTranslation } from "@/hooks/use-translation";
import type { Employee } from "@/types";
import type {
  EmployeePayslip,
  EmployeeSalaryProfile,
  PayrollDashboardSummary,
  PayslipHistoryItem,
} from "@/types/payroll";
import {
  EmployeeContractHero,
  EmployeePayslipHero,
  ImpactLists,
} from "./payroll-workspace-shared";

function mergeCurrentPayslipIntoHistory(
  history: PayslipHistoryItem[],
  payslip: EmployeePayslip | null,
  periodLabel: string
): PayslipHistoryItem[] {
  if (!payslip) return history;
  const exists = history.some((item) => item.periodId === payslip.periodId);
  if (exists) {
    return history.map((item) =>
      item.periodId === payslip.periodId
        ? {
            ...item,
            net: payslip.net,
            gross: payslip.gross,
            deductionsTotal: payslip.deductionsTotal,
            overtimePay: payslip.overtimePay,
            allowancesTotal: payslip.allowancesTotal,
            bonusesTotal: payslip.bonusesTotal,
            currency: payslip.currency,
          }
        : item
    );
  }
  return [
    ...history,
    {
      id: payslip.id,
      periodId: payslip.periodId,
      periodLabel,
      payDate: periodLabel,
      net: payslip.net,
      gross: payslip.gross,
      status: "hr_review",
      deductionsTotal: payslip.deductionsTotal,
      overtimePay: payslip.overtimePay,
      allowancesTotal: payslip.allowancesTotal,
      bonusesTotal: payslip.bonusesTotal,
      currency: payslip.currency,
    },
  ];
}

export function PayrollEmployeeView({
  summary,
  myProfile,
  myPayslip,
  myHistory,
  myEmployee,
}: {
  summary: PayrollDashboardSummary;
  myProfile: EmployeeSalaryProfile | null;
  myPayslip: EmployeePayslip | null;
  myHistory: PayslipHistoryItem[];
  myEmployee: Pick<Employee, "name" | "employeeId" | "department" | "email">;
}) {
  const { t } = useTranslation();
  const hasPayslip = Boolean(myPayslip);
  const historyItems = useMemo(
    () =>
      mergeCurrentPayslipIntoHistory(
        myHistory,
        myPayslip,
        summary.period.label
      ),
    [myHistory, myPayslip, summary.period.label]
  );
  const historyPanel = <PayslipHistoryPanel items={historyItems} />;

  if (!myProfile) {
    return (
      <div className="space-y-3 sm:space-y-4">
        <PageHeader
          className="!mb-2 sm:!mb-3"
          title={t("payroll.myTitle")}
          showBreadcrumbs={false}
        />
        <EmptyState title={t("payroll.noSalaryConfigured")} />
        {historyPanel}
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <PageHeader
        className="!mb-2 sm:!mb-3"
        title={t("payroll.myTitle")}
        showBreadcrumbs={false}
      />

      {hasPayslip && myPayslip ? (
        <EmployeePayslipHero
          payslip={myPayslip}
          periodLabel={summary.period.label}
        />
      ) : (
        <EmployeeContractHero
          profile={myProfile}
          periodLabel={summary.period.label}
        />
      )}

      <div className="lg:hidden">
        <Tabs
          defaultValue={hasPayslip ? "slip" : "history"}
          className="space-y-3"
        >
          <div className="sticky top-[var(--chrome-sticky-top)] z-20 -mx-3 border-b border-border/60 bg-background/95 px-3 py-2 backdrop-blur-xl sm:-mx-4 sm:px-4">
            <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-xl border border-border/60 bg-muted/50 p-1">
              <TabsTrigger
                value="slip"
                className="min-h-10 truncate rounded-lg px-1 text-[11px] font-semibold sm:min-h-11 sm:text-[12px]"
              >
                {t("payroll.mobileTabSlip")}
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="min-h-10 truncate rounded-lg px-1 text-[11px] font-semibold sm:min-h-11 sm:text-[12px]"
              >
                {t("payroll.mobileTabHistory")}
              </TabsTrigger>
              <TabsTrigger
                value="profile"
                className="min-h-10 truncate rounded-lg px-1 text-[11px] font-semibold sm:min-h-11 sm:text-[12px]"
              >
                {hasPayslip
                  ? t("payroll.mobileTabProfile")
                  : t("payroll.mobileTabContract")}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="slip" className="mt-0 space-y-3">
            {hasPayslip && myPayslip ? (
              <>
                <PayslipStatementView
                  payslip={myPayslip}
                  profile={myProfile}
                  employee={myEmployee}
                  periodLabel={summary.period.label}
                />
                <ImpactLists payslip={myPayslip} />
                {historyPanel}
              </>
            ) : (
              <>
                <EmptyState title={t("payroll.noPayslipYet")} />
                {historyPanel}
              </>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            {historyPanel}
          </TabsContent>

          <TabsContent value="profile" className="mt-0 space-y-3">
            <SalaryProfilePanel profile={myProfile} payslip={myPayslip} />
          </TabsContent>
        </Tabs>
      </div>

      <div className="hidden space-y-4 lg:block">
        {hasPayslip && myPayslip ? (
          <>
            <PayslipStatementView
              payslip={myPayslip}
              profile={myProfile}
              employee={myEmployee}
              periodLabel={summary.period.label}
            />
            <ImpactLists payslip={myPayslip} />
          </>
        ) : null}
        {historyPanel}
        <SalaryProfilePanel profile={myProfile} payslip={myPayslip} />
      </div>
    </div>
  );
}
