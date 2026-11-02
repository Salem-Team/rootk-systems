"use client";

import { formatEgp } from "@/lib/payroll";
import { formatHmDuration } from "@/lib/duration-format";
import { useTranslation } from "@/hooks/use-translation";
import type { TranslationPath } from "@/i18n";
import type { EmployeePayslip } from "@/types/payroll";

/** Compact “why deducted” list for one payslip. */
export function PayrollDeductionWhy({
  payslip,
  compact = false,
}: {
  payslip: EmployeePayslip;
  compact?: boolean;
}) {
  const { t, locale } = useTranslation();
  const loc = locale === "ar" ? "ar" : "en";
  const att = payslip.attendanceImpacts ?? [];
  const leave = payslip.leaveImpacts ?? [];
  const statutory: { label: string; amount: number }[] = [];
  if (payslip.insurance > 0)
    statutory.push({ label: t("payroll.insurance"), amount: payslip.insurance });
  if (payslip.tax > 0)
    statutory.push({ label: t("payroll.tax"), amount: payslip.tax });
  if (payslip.loans > 0)
    statutory.push({ label: t("payroll.loan"), amount: payslip.loans });
  if (payslip.advances > 0)
    statutory.push({ label: t("payroll.advances"), amount: payslip.advances });
  if (payslip.penalties > 0)
    statutory.push({ label: t("payroll.penalties"), amount: payslip.penalties });

  const empty =
    att.length === 0 && leave.length === 0 && statutory.length === 0;

  function impactLabel(line: (typeof att)[number]) {
    const kindKey = `payroll.impactKind.${line.kind}` as TranslationPath;
    const kindLabel = t(kindKey);
    if (kindLabel && kindLabel !== kindKey) return kindLabel;
    return line.label || line.kind;
  }

  function impactWhy(line: (typeof att)[number]) {
    const bits: string[] = [line.date];
    if (line.minutes) bits.push(formatHmDuration(line.minutes, t));
    if (line.dayFraction > 0) {
      bits.push(
        t("payroll.impactFormulaDay", {
          pct: Math.round(line.dayFraction * 100),
          rate: formatEgp(payslip.dailyRate, loc),
        })
      );
    }
    if (line.label?.startsWith("late_tier_")) {
      bits.push(t("payroll.deductionWhyLateTier", { minutes: line.label.replace("late_tier_", "") }));
    }
    return bits.join(" · ");
  }

  if (empty) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("payroll.deductionWhyEmpty")}
      </p>
    );
  }

  return (
    <ul className={compact ? "space-y-1.5" : "space-y-2"}>
      {att.map((line) => (
        <li
          key={line.id}
          className="flex items-start justify-between gap-3 text-sm"
        >
          <div className="min-w-0">
            <p className="font-medium text-foreground">{impactLabel(line)}</p>
            <p className="text-[12px] text-muted-foreground">{impactWhy(line)}</p>
          </div>
          <span className="shrink-0 tabular-nums font-semibold text-rose-700 dark:text-rose-300">
            −{formatEgp(line.amount, loc)}
          </span>
        </li>
      ))}
      {leave.map((line) => (
        <li
          key={line.id}
          className="flex items-start justify-between gap-3 text-sm"
        >
          <div className="min-w-0">
            <p className="font-medium">{line.label}</p>
            <p className="text-[12px] text-muted-foreground">
              {line.startDate} → {line.endDate} · {line.behavior}
            </p>
          </div>
          <span className="shrink-0 tabular-nums font-semibold text-rose-700 dark:text-rose-300">
            −{formatEgp(line.amount, loc)}
          </span>
        </li>
      ))}
      {statutory.map((row) => (
        <li
          key={row.label}
          className="flex items-start justify-between gap-3 text-sm"
        >
          <p className="font-medium">{row.label}</p>
          <span className="shrink-0 tabular-nums font-semibold text-rose-700 dark:text-rose-300">
            −{formatEgp(row.amount, loc)}
          </span>
        </li>
      ))}
    </ul>
  );
}
