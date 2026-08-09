"use client";

import { EmptyState } from "@/components/shared/empty-state";
import { SalaryProfilePanel } from "@/components/payroll/salary-profile-panel";
import { PayslipStatementView } from "@/components/payroll/payslip-statement";
import { useTranslation } from "@/hooks/use-translation";
import type { Employee } from "@/types";
import type {
  EmployeePayslip,
  EmployeeSalaryProfile,
  PayrollPersona,
} from "@/types/payroll";
import { EmployeePicker, ImpactLists } from "./payroll-workspace-shared";

export function PayrollSalaryTab({
  persona,
  employees,
  payslips,
  selectedEmployeeId,
  onSelectedEmployeeIdChange,
  selectedProfileState,
  selectedPayslip,
  selectedEmployee,
  periodLabel,
  onEditProfile,
}: {
  persona: PayrollPersona;
  employees: Employee[];
  payslips: EmployeePayslip[];
  selectedEmployeeId: string;
  onSelectedEmployeeIdChange: (id: string) => void;
  selectedProfileState: EmployeeSalaryProfile | null;
  selectedPayslip: EmployeePayslip | null;
  selectedEmployee: Employee | null;
  periodLabel: string;
  onEditProfile: () => void;
}) {
  const { t } = useTranslation();
  const canEditSalary =
    persona === "admin" || persona === "hr" || persona === "finance";

  return (
    <>
      <EmployeePicker
        employees={employees}
        payslips={payslips}
        value={selectedEmployeeId}
        onChange={onSelectedEmployeeIdChange}
      />
      {!selectedEmployeeId ? (
        <EmptyState
          title={t("payroll.selectEmployee")}
          description={t("payroll.selectEmployeeToViewSalary")}
        />
      ) : selectedProfileState ? (
        <SalaryProfilePanel
          profile={selectedProfileState}
          payslip={selectedPayslip}
          onEdit={canEditSalary ? onEditProfile : undefined}
        />
      ) : (
        <EmptyState
          title={t("payroll.noSalaryProfile")}
          description={t("payroll.noSalaryProfileDesc")}
          actionLabel={
            canEditSalary ? t("payroll.createSalaryProfile") : undefined
          }
          onAction={canEditSalary ? onEditProfile : undefined}
        />
      )}
      {selectedPayslip ? (
        <PayslipStatementView
          payslip={selectedPayslip}
          profile={selectedProfileState}
          employee={selectedEmployee}
          periodLabel={periodLabel}
        />
      ) : null}
      {selectedPayslip ? <ImpactLists payslip={selectedPayslip} /> : null}
    </>
  );
}
