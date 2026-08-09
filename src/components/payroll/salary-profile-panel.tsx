"use client";

import { useTranslation } from "@/hooks/use-translation";
import type { EmployeePayslip, EmployeeSalaryProfile } from "@/types/payroll";
import { SalaryProfileDeductionsCard } from "./salary-profile-deductions-card";
import { SalaryProfileDetailCard } from "./salary-profile-detail-card";
import { SalaryProfileSummaryCard } from "./salary-profile-summary-card";
import { contractTotals } from "./salary-profile-totals";

export function SalaryProfilePanel({
  profile,
  payslip,
  onEdit,
}: {
  profile: EmployeeSalaryProfile;
  /** Engine result for the period when a run exists — preferred over contract preview. */
  payslip?: EmployeePayslip | null;
  onEdit?: () => void;
}) {
  const { locale } = useTranslation();
  const loc = locale === "ar" ? "ar" : "en";
  const contract = contractTotals(profile);
  const gross = payslip?.gross ?? contract.gross;
  const deductionsTotal = payslip?.deductionsTotal ?? contract.deductionsTotal;
  const net = payslip?.net ?? contract.net;
  const fromRun = Boolean(payslip);

  return (
    <div className="space-y-4">
      <SalaryProfileSummaryCard
        gross={gross}
        deductionsTotal={deductionsTotal}
        net={net}
        payslip={payslip}
        loc={loc}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <SalaryProfileDetailCard profile={profile} loc={loc} onEdit={onEdit} />
        <SalaryProfileDeductionsCard
          profile={profile}
          deductionsTotal={fromRun ? deductionsTotal : contract.deductionsTotal}
          loc={loc}
        />
      </div>
    </div>
  );
}
