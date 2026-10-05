"use client";

import { useTranslation } from "@/hooks/use-translation";
import {
  formatLateDeductionAmount,
  lateChargeHours,
  type LateDeduction,
} from "@/lib/attendance-late-deduction";
import { cn } from "@/lib/utils";

export function LateDeductionChip({
  deduction,
  className,
}: {
  deduction: LateDeduction;
  className?: string;
}) {
  const { t, locale } = useTranslation();
  const hours = lateChargeHours(deduction);
  const fraction =
    hours === 1
      ? t("attendance.lateDeductionHourOne")
      : hours === 2
        ? t("attendance.lateDeductionHourTwo")
        : hours <= 10
          ? t("attendance.lateDeductionHours", { hours })
          : t("attendance.lateDeductionHoursMany", { hours });
  const label =
    deduction.amount != null
      ? t("attendance.lateDeductionAmount", {
          amount: formatLateDeductionAmount(
            deduction.amount,
            locale,
            deduction.currency
          ),
          fraction,
        })
      : fraction;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg border border-rose-200/80 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100",
        className
      )}
    >
      {label}
    </span>
  );
}
