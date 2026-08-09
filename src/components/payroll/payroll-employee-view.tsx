"use client";

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

  if (!myProfile) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <PageHeader
          className="mb-4 sm:mb-7"
          eyebrow={t("payroll.eyebrow")}
          title={t("payroll.myTitle")}
          description={t("payroll.myDesc")}
        />
        <EmptyState
          title={t("payroll.noSalaryConfigured")}
          description={t("payroll.noSalaryConfiguredDesc")}
        />
      </div>
    );
  }

  const hasPayslip = Boolean(myPayslip);

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        className="mb-4 sm:mb-7"
        eyebrow={t("payroll.eyebrow")}
        title={t("payroll.myTitle")}
        description={t("payroll.myDesc")}
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
          defaultValue={hasPayslip ? "slip" : "profile"}
          className="space-y-4"
        >
          <div className="sticky top-14 z-20 -mx-3 bg-background/90 px-3 py-2 backdrop-blur-xl sm:-mx-4 sm:px-4">
            <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-xl border border-border/60 bg-card p-1 shadow-sm sm:rounded-2xl">
              <TabsTrigger
                value="slip"
                className="min-h-10 truncate rounded-lg px-1 text-[11px] font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md sm:min-h-11 sm:rounded-xl sm:text-[12px]"
              >
                {t("payroll.mobileTabSlip")}
              </TabsTrigger>
              <TabsTrigger
                value="profile"
                className="min-h-10 truncate rounded-lg px-1 text-[11px] font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md sm:min-h-11 sm:rounded-xl sm:text-[12px]"
              >
                {hasPayslip
                  ? t("payroll.mobileTabProfile")
                  : t("payroll.mobileTabContract")}
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="min-h-10 truncate rounded-lg px-1 text-[11px] font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md sm:min-h-11 sm:rounded-xl sm:text-[12px]"
              >
                {t("payroll.mobileTabHistory")}
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="slip" className="mt-0 space-y-4">
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
            ) : (
              <EmptyState
                title={t("payroll.noPayslipYet")}
                description={t("payroll.profileReadyDesc", {
                  period: summary.period.label,
                })}
              />
            )}
          </TabsContent>
          <TabsContent value="profile" className="mt-0 space-y-4">
            <SalaryProfilePanel profile={myProfile} payslip={myPayslip} />
          </TabsContent>
          <TabsContent value="history" className="mt-0 space-y-4">
            <PayslipHistoryPanel items={myHistory} />
          </TabsContent>
        </Tabs>
      </div>

      <div className="hidden space-y-6 lg:block">
        {hasPayslip && myPayslip ? (
          <>
            <PayslipStatementView
              payslip={myPayslip}
              profile={myProfile}
              employee={myEmployee}
              periodLabel={summary.period.label}
            />
            <SalaryProfilePanel profile={myProfile} payslip={myPayslip} />
            <PayslipHistoryPanel items={myHistory} />
            <ImpactLists payslip={myPayslip} />
          </>
        ) : (
          <>
            <SalaryProfilePanel profile={myProfile} payslip={null} />
            <PayslipHistoryPanel items={myHistory} />
          </>
        )}
      </div>
    </div>
  );
}
