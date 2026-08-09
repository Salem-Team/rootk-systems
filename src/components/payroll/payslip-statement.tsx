"use client";

import { useMemo, useRef } from "react";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types";
import type { EmployeePayslip, EmployeeSalaryProfile } from "@/types/payroll";
import { PayslipStatementFooter } from "./payslip-statement-footer";
import {
  PayslipStatementHeader,
  PayslipStatementIdentity,
} from "./payslip-statement-header";
import { lineLabel, StatementColumn } from "./payslip-statement-column";

export function PayslipStatementView({
  payslip,
  profile,
  employee,
  periodLabel,
  companyName = "ROOTK Systems",
  compact,
}: {
  payslip: EmployeePayslip;
  profile?: EmployeeSalaryProfile | null;
  employee?: Pick<Employee, "name" | "employeeId" | "department" | "email"> | null;
  periodLabel: string;
  companyName?: string;
  compact?: boolean;
}) {
  const { t, locale } = useTranslation();
  const loc = locale === "ar" ? "ar" : "en";
  const printRef = useRef<HTMLElement>(null);

  const earnings = useMemo(
    () => payslip.lines.filter((l) => l.amount > 0),
    [payslip.lines]
  );
  const deductions = useMemo(
    () => payslip.lines.filter((l) => l.amount < 0),
    [payslip.lines]
  );

  const earningsTotal = earnings.reduce((s, l) => s + l.amount, 0);
  const deductionsAbs = Math.abs(
    deductions.reduce((s, l) => s + l.amount, 0)
  );

  function handlePrint() {
    window.print();
  }

  return (
    <section
      ref={printRef}
      className={cn(
        "payslip-statement surface-panel overflow-hidden print:border print:shadow-none",
        compact && "text-[13px]"
      )}
      aria-labelledby="payslip-statement-title"
    >
      <PayslipStatementHeader
        payslip={payslip}
        periodLabel={periodLabel}
        companyName={companyName}
        onPrint={handlePrint}
      />

      <PayslipStatementIdentity
        payslip={payslip}
        profile={profile}
        employee={employee}
        loc={loc}
      />

      <div className="grid gap-0 sm:grid-cols-2">
        <StatementColumn
          title={t("payroll.earnings")}
          totalLabel={t("payroll.gross")}
          total={earningsTotal}
          lines={earnings}
          locale={loc}
          currency={payslip.currency}
          resolveLabel={(line) => lineLabel(line, t)}
          tone="earn"
        />
        <StatementColumn
          title={t("payroll.deductions")}
          totalLabel={t("payroll.deductions")}
          total={deductionsAbs}
          lines={deductions}
          locale={loc}
          currency={payslip.currency}
          resolveLabel={(line) => lineLabel(line, t)}
          tone="deduct"
          absolute
        />
      </div>

      <PayslipStatementFooter payslip={payslip} loc={loc} />
    </section>
  );
}
