"use client";

import { formatEgp } from "@/lib/payroll";
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
  /** Engine result for the period when a run exists — shown under contract totals. */
  payslip?: EmployeePayslip | null;
  onEdit?: () => void;
}) {
  const { t, locale } = useTranslation();
  const loc = locale === "ar" ? "ar" : "en";
  // Profile card always reflects the saved contract immediately after edits.
  // Period payslip (attendance-adjusted) is shown separately when available.
  const contract = contractTotals(profile);

  return (
    <div className="space-y-4">
      <SalaryProfileSummaryCard
        gross={contract.gross}
        deductionsTotal={contract.deductionsTotal}
        net={contract.net}
        payslip={null}
        loc={loc}
      />
      {payslip ? (
        <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-sm">
          <p className="font-medium">{t("payroll.periodCalculated")}</p>
          <p className="mt-1 text-muted-foreground">
            {t("payroll.netSalary")}:{" "}
            <span className="font-semibold tabular-nums text-foreground">
              {formatEgp(payslip.net, loc)}
            </span>
            {" · "}
            {t("payroll.deductions")}:{" "}
            <span className="font-semibold tabular-nums text-rose-700 dark:text-rose-300">
              {formatEgp(payslip.deductionsTotal, loc)}
            </span>
            {" · "}
            {t("payroll.gross")}:{" "}
            <span className="font-semibold tabular-nums text-foreground">
              {formatEgp(payslip.gross, loc)}
            </span>
          </p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {t("payroll.finalSalaryFromRun")}
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <SalaryProfileDetailCard profile={profile} loc={loc} onEdit={onEdit} />
        <SalaryProfileDeductionsCard
          profile={profile}
          deductionsTotal={contract.deductionsTotal}
          loc={loc}
        />
      </div>
    </div>
  );
}
