"use client";

import { StatChip } from "@/components/shared/stat-chip";
import { Badge } from "@/components/ui/badge";
import { formatEgp } from "@/lib/payroll";
import { formatHmDuration } from "@/lib/duration-format";
import { useTranslation } from "@/hooks/use-translation";
import type { TranslationPath } from "@/i18n";
import type { Employee } from "@/types";
import type { EmployeePayslip, EmployeeSalaryProfile } from "@/types/payroll";

export function EmployeePayslipHero({
  payslip,
  periodLabel,
}: {
  payslip: EmployeePayslip;
  periodLabel: string;
}) {
  const { t, locale } = useTranslation();
  const loc = locale === "ar" ? "ar" : "en";
  const cards = [
    { label: t("payroll.currentPeriod"), value: periodLabel, mono: false },
    { label: t("payroll.netSalary"), value: formatEgp(payslip.net, loc), mono: true },
    { label: t("payroll.gross"), value: formatEgp(payslip.gross, loc), mono: true },
    { label: t("payroll.deductions"), value: formatEgp(payslip.deductionsTotal, loc), mono: true },
  ];
  return (
    <ul className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
      {cards.map((card) => (
        <li key={card.label}>
          <StatChip
            label={card.label}
            value={card.value}
            className={
              card.mono
                ? "[&_.stat-value]:font-mono [&_.stat-value]:text-[1.05rem] sm:[&_.stat-value]:text-[1.15rem]"
                : "[&_.stat-value]:text-[0.95rem] sm:[&_.stat-value]:text-base"
            }
          />
        </li>
      ))}
    </ul>
  );
}

function contractPreview(profile: EmployeeSalaryProfile) {
  const a = profile.allowances;
  const d = profile.deductions;
  const allowancesTotal =
    a.housing + a.transportation + a.meal + a.phone + a.shift + a.other;
  const gross =
    profile.basicSalary +
    allowancesTotal +
    profile.bonuses +
    profile.commission +
    profile.incentives +
    profile.manualAdjustments;
  const deductionsTotal =
    d.insurance + d.tax + d.loan + d.advances + d.recurring + d.penalties;
  return { gross, deductionsTotal, net: gross - deductionsTotal };
}

/** Shown when HR saved a salary profile but the period payslip is not generated yet. */
export function EmployeeContractHero({
  profile,
  periodLabel,
}: {
  profile: EmployeeSalaryProfile;
  periodLabel: string;
}) {
  const { t, locale } = useTranslation();
  const loc = locale === "ar" ? "ar" : "en";
  const totals = contractPreview(profile);
  const cards = [
    { label: t("payroll.currentPeriod"), value: periodLabel, mono: false },
    {
      label: t("payroll.contractNet"),
      value: formatEgp(totals.net, loc, profile.currency),
      mono: true,
    },
    {
      label: t("payroll.gross"),
      value: formatEgp(totals.gross, loc, profile.currency),
      mono: true,
    },
    {
      label: t("payroll.basicSalary"),
      value: formatEgp(profile.basicSalary, loc, profile.currency),
      mono: true,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-tight text-foreground">
            {t("payroll.profileReadyTitle")}
          </p>
          <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
            {t("payroll.profileReadyDesc", { period: periodLabel })}
          </p>
        </div>
        <Badge
          variant="secondary"
          className="shrink-0 border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200"
        >
          {t("payroll.awaitingPayslipBadge")}
        </Badge>
      </div>
      <ul className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        {cards.map((card) => (
          <li key={card.label}>
            <StatChip
              label={card.label}
              value={card.value}
              className={
                card.mono
                  ? "[&_.stat-value]:font-mono [&_.stat-value]:text-[1.05rem] sm:[&_.stat-value]:text-[1.15rem]"
                  : "[&_.stat-value]:text-[0.95rem] sm:[&_.stat-value]:text-base"
              }
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function EmployeePicker({
  employees,
  payslips,
  value,
  onChange,
}: {
  employees: Employee[];
  payslips: EmployeePayslip[];
  value: string;
  onChange: (id: string) => void;
}) {
  const { t, locale } = useTranslation();
  const loc = locale === "ar" ? "ar" : "en";
  return (
    <label className="flex flex-col gap-1.5 text-sm sm:max-w-sm">
      <span className="font-medium">{t("payroll.selectEmployee")}</span>
      <select
        className="h-9 rounded-lg border border-border/85 bg-card px-3 text-sm shadow-[0_1px_2px_rgba(11,20,36,0.035)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{t("payroll.selectEmployeePlaceholder")}</option>
        {employees.map((emp) => {
          const slip = payslips.find((p) => p.employeeId === emp.id);
          return (
            <option key={emp.id} value={emp.id}>
              {emp.name}
              {emp.employeeId ? ` · ${emp.employeeId}` : ""}
              {slip ? ` · ${formatEgp(slip.net, loc)}` : ""}
            </option>
          );
        })}
      </select>
    </label>
  );
}

export function ImpactLists({ payslip }: { payslip: EmployeePayslip }) {
  const { t, locale } = useTranslation();
  const loc = locale === "ar" ? "ar" : "en";

  function impactLabel(line: (typeof payslip.attendanceImpacts)[number]) {
    const kindKey = `payroll.impactKind.${line.kind}` as TranslationPath;
    const kindLabel = t(kindKey);
    if (
      line.label.startsWith("late_tier_") ||
      line.label === "late_minutes" ||
      line.label === "missing_check_in" ||
      line.label === "missing_check_out" ||
      line.label === "absence" ||
      line.label === "half_day" ||
      line.label === "early_leave" ||
      !line.label
    ) {
      if (kindLabel && kindLabel !== kindKey) return kindLabel;
    }
    if (kindLabel && kindLabel !== kindKey) {
      return `${kindLabel} · ${line.label}`;
    }
    return line.label || line.kind;
  }

  function impactFormula(line: (typeof payslip.attendanceImpacts)[number]) {
    const parts: string[] = [line.date];
    if (line.minutes) {
      parts.push(formatHmDuration(line.minutes, t));
    }
    if (line.dayFraction > 0) {
      parts.push(
        t("payroll.impactFormulaDay", {
          pct: Math.round(line.dayFraction * 100),
          rate: formatEgp(payslip.dailyRate, loc),
        })
      );
    }
    return parts.join(" · ");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="surface-panel overflow-hidden">
        <div className="panel-header">
          <h3 className="text-[0.95rem] font-semibold">
            {t("payroll.attendanceImpact")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t("payroll.attendanceImpactDesc")}
          </p>
        </div>
        <ul className="max-h-72 divide-y divide-border/60 overflow-auto">
          {payslip.attendanceImpacts?.length ? (
            payslip.attendanceImpacts.map((line) => (
              <li
                key={line.id}
                className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm"
              >
                <div>
                  <p className="font-medium">{impactLabel(line)}</p>
                  <p className="text-xs text-muted-foreground">
                    {impactFormula(line)}
                  </p>
                </div>
                <span className="tabular-nums font-semibold text-rose-700 dark:text-rose-300">
                  −{formatEgp(line.amount, loc)}
                </span>
              </li>
            ))
          ) : (
            <li className="px-5 py-4 text-sm text-muted-foreground">
              {t("common.noResults")}
            </li>
          )}
        </ul>
      </section>
      <section className="surface-panel overflow-hidden">
        <div className="panel-header">
          <h3 className="text-[0.95rem] font-semibold">
            {t("payroll.leaveImpact")}
          </h3>
        </div>
        <ul className="max-h-72 divide-y divide-border/60 overflow-auto">
          {payslip.leaveImpacts?.length ? (
            payslip.leaveImpacts.map((line) => (
              <li
                key={line.id}
                className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm"
              >
                <div>
                  <p className="font-medium">{line.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {line.startDate} → {line.endDate} · {line.behavior}
                  </p>
                </div>
                <span className="tabular-nums font-semibold text-rose-700 dark:text-rose-300">
                  −{formatEgp(line.amount, loc)}
                </span>
              </li>
            ))
          ) : (
            <li className="px-5 py-4 text-sm text-muted-foreground">
              {t("common.noResults")}
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
