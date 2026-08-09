import Image from "next/image";
import { Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LOGO_SRC } from "@/constants";
import { formatEgp } from "@/lib/payroll";
import { useTranslation } from "@/hooks/use-translation";
import type { Employee } from "@/types";
import type { EmployeePayslip, EmployeeSalaryProfile } from "@/types/payroll";

export function PayslipStatementHeader({
  payslip,
  periodLabel,
  companyName,
  onPrint,
}: {
  payslip: EmployeePayslip;
  periodLabel: string;
  companyName: string;
  onPrint: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 bg-gradient-to-b from-primary/[0.06] to-transparent px-4 py-4 sm:px-5 sm:py-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-white shadow-sm print:shadow-none">
          <Image
            src={LOGO_SRC}
            alt=""
            width={44}
            height={44}
            className="h-full w-full object-contain p-1"
          />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-primary/80">
            {companyName}
          </p>
          <h2
            id="payslip-statement-title"
            className="truncate text-base font-bold tracking-tight text-foreground sm:text-lg"
          >
            {t("payroll.statementTitle")}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("payroll.statementPeriod")}:{" "}
            <span className="font-medium text-foreground">{periodLabel}</span>
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Badge variant="outline" className="font-mono text-[10px]">
          {payslip.periodId}
        </Badge>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          onClick={onPrint}
        >
          <Printer className="h-3.5 w-3.5" aria-hidden />
          {t("payroll.printStatement")}
        </Button>
      </div>
    </div>
  );
}

export function PayslipStatementIdentity({
  payslip,
  profile,
  employee,
  loc,
}: {
  payslip: EmployeePayslip;
  profile?: EmployeeSalaryProfile | null;
  employee?: Pick<Employee, "name" | "employeeId" | "department" | "email"> | null;
  loc: "en" | "ar";
}) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-4 border-b border-border/50 px-4 py-4 sm:grid-cols-2 sm:px-5">
      <dl className="space-y-1.5 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">{t("payroll.employeeName")}</dt>
          <dd className="font-semibold text-end">{employee?.name ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">{t("employees.employeeId")}</dt>
          <dd className="font-mono text-[12px] text-end">
            {employee?.employeeId ?? payslip.employeeId}
          </dd>
        </div>
        {employee?.department ? (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{t("common.department")}</dt>
            <dd className="text-end">{employee.department}</dd>
          </div>
        ) : null}
      </dl>
      <dl className="space-y-1.5 text-sm">
        {profile ? (
          <>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{t("payroll.bankAccount")}</dt>
              <dd className="font-mono text-[12px] text-end">
                {profile.bankAccount || "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{t("payroll.paymentMethod")}</dt>
              <dd className="text-end">{profile.paymentMethod}</dd>
            </div>
          </>
        ) : null}
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">{t("payroll.dailyRate")}</dt>
          <dd className="tabular-nums text-end">
            {formatEgp(payslip.dailyRate, loc, payslip.currency)}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">{t("payroll.hourlyRate")}</dt>
          <dd className="tabular-nums text-end">
            {formatEgp(payslip.hourlyRate, loc, payslip.currency)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
