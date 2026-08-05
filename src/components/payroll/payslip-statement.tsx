"use client";

import { useMemo, useRef } from "react";
import Image from "next/image";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LOGO_SRC } from "@/constants";
import { formatEgp } from "@/lib/payroll";
import { useTranslation } from "@/hooks/use-translation";
import type { TranslationPath } from "@/i18n";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types";
import type {
  EmployeePayslip,
  EmployeeSalaryProfile,
  PayslipLine,
} from "@/types/payroll";

const LINE_CODE_KEYS: Record<string, TranslationPath> = {
  BASIC: "payroll.line.BASIC",
  HOUSING: "payroll.line.HOUSING",
  TRANS: "payroll.line.TRANS",
  MEAL: "payroll.line.MEAL",
  PHONE: "payroll.line.PHONE",
  OTHER: "payroll.line.OTHER",
  SHIFT: "payroll.line.SHIFT",
  BONUS: "payroll.line.BONUS",
  COMM: "payroll.line.COMM",
  INC: "payroll.line.INC",
  ADJ: "payroll.line.ADJ",
  OT: "payroll.line.OT",
  ATT: "payroll.line.ATT",
  LEAVE: "payroll.line.LEAVE",
  INS: "payroll.line.INS",
  TAX: "payroll.line.TAX",
  LOAN: "payroll.line.LOAN",
  ADV: "payroll.line.ADV",
  REC: "payroll.line.REC",
  PEN: "payroll.line.PEN",
};

function lineLabel(
  line: PayslipLine,
  t: (path: TranslationPath) => string
): string {
  const key = LINE_CODE_KEYS[line.code.toUpperCase()];
  if (!key) return line.label;
  const translated = t(key);
  return translated === key ? line.label : translated;
}

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
            onClick={handlePrint}
          >
            <Printer className="h-3.5 w-3.5" aria-hidden />
            {t("payroll.printStatement")}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 border-b border-border/50 px-4 py-4 sm:grid-cols-2 sm:px-5">
        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{t("payroll.employeeName")}</dt>
            <dd className="font-semibold text-end">
              {employee?.name ?? "—"}
            </dd>
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

      <div className="flex flex-col gap-3 border-t border-border/60 bg-primary/[0.04] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t("payroll.netSalary")}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-primary sm:text-3xl">
            {formatEgp(payslip.net, loc, payslip.currency)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {t("payroll.statementNetHint")}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm sm:text-end">
          <div>
            <p className="text-[10px] text-muted-foreground">
              {t("payroll.employeeCost")}
            </p>
            <p className="font-semibold tabular-nums">
              {formatEgp(payslip.employeeCost, loc, payslip.currency)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">
              {t("payroll.employerCost")}
            </p>
            <p className="font-semibold tabular-nums">
              {formatEgp(payslip.employerCost, loc, payslip.currency)}
            </p>
          </div>
        </div>
      </div>

      {(payslip.attendanceImpacts.length > 0 ||
        payslip.leaveImpacts.length > 0) && (
        <div className="border-t border-border/50 px-4 py-3 sm:px-5">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t("payroll.statementImpacts")}
          </p>
          <div className="flex flex-wrap gap-2 text-[11px]">
            {payslip.attendanceDeductions > 0 ? (
              <Badge variant="warning" className="font-normal">
                {t("payroll.attendanceImpact")}:{" "}
                {formatEgp(payslip.attendanceDeductions, loc, payslip.currency)}
              </Badge>
            ) : null}
            {payslip.leaveDeductions > 0 ? (
              <Badge variant="outline" className="font-normal">
                {t("payroll.leaveImpact")}:{" "}
                {formatEgp(payslip.leaveDeductions, loc, payslip.currency)}
              </Badge>
            ) : null}
            {payslip.overtimePay > 0 ? (
              <Badge variant="secondary" className="font-normal">
                {t("payroll.overtime")}:{" "}
                {formatEgp(payslip.overtimePay, loc, payslip.currency)}
              </Badge>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}

function StatementColumn({
  title,
  totalLabel,
  total,
  lines,
  locale,
  currency,
  resolveLabel,
  tone,
  absolute,
}: {
  title: string;
  totalLabel: string;
  total: number;
  lines: PayslipLine[];
  locale: string;
  currency: string;
  resolveLabel: (line: PayslipLine) => string;
  tone: "earn" | "deduct";
  absolute?: boolean;
}) {
  return (
    <div
      className={cn(
        "border-border/50 px-4 py-3 sm:px-5 sm:py-4",
        tone === "deduct" ? "sm:border-s" : "border-b sm:border-b-0"
      )}
    >
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {lines.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">—</p>
      ) : (
        <ul className="space-y-1.5">
          {lines.map((line) => (
            <li
              key={line.id}
              className="flex items-baseline justify-between gap-3 text-sm"
            >
              <span className="min-w-0 truncate text-foreground/90">
                {resolveLabel(line)}
              </span>
              <span
                className={cn(
                  "shrink-0 tabular-nums font-medium",
                  tone === "deduct"
                    ? "text-rose-700 dark:text-rose-300"
                    : "text-foreground"
                )}
              >
                {formatEgp(
                  absolute ? Math.abs(line.amount) : line.amount,
                  locale,
                  currency
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2 text-sm font-semibold">
        <span>{totalLabel}</span>
        <span className="tabular-nums">
          {formatEgp(total, locale, currency)}
        </span>
      </div>
    </div>
  );
}
