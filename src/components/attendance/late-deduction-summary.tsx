"use client";

import { useMemo } from "react";
import { useTranslation } from "@/hooks/use-translation";
import {
  formatLateDeductionAmount,
  lateChargeHours,
  readLateDeduction,
  sumLateDeductions,
} from "@/lib/attendance-late-deduction";
import type { AttendanceRecord } from "@/types";

function cairoMonthKey(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
  }).format(now);
}

export function LateDeductionSummary({
  records,
  today,
}: {
  records: AttendanceRecord[];
  today?: AttendanceRecord | null;
}) {
  const { t, locale } = useTranslation();
  const monthKey = cairoMonthKey();
  const summary = useMemo(
    () => sumLateDeductions(records, monthKey),
    [records, monthKey]
  );
  const todayHit = today ? readLateDeduction(today) : null;
  const chargeLabel = (hit: NonNullable<typeof todayHit>) => {
    const hours = lateChargeHours(hit);
    if (hours === 1) return t("attendance.lateDeductionHourOne");
    if (hours === 2) return t("attendance.lateDeductionHourTwo");
    if (hours <= 10) return t("attendance.lateDeductionHours", { hours });
    return t("attendance.lateDeductionHoursMany", { hours });
  };

  if (!todayHit && summary.count === 0) return null;

  return (
    <section className="rounded-xl border border-rose-200/80 bg-rose-50/80 p-3.5 dark:border-rose-900 dark:bg-rose-950/30">
      <p className="text-sm font-semibold text-rose-950 dark:text-rose-50">
        {t("attendance.lateDeductionMonth")}
      </p>
      <p className="mt-0.5 text-xs text-rose-800/80 dark:text-rose-100/80">
        {t("attendance.lateDeductionMonthHint")}
      </p>
      {todayHit ? (
        <p className="mt-2 text-sm font-medium text-rose-900 dark:text-rose-50">
          {todayHit.amount != null
            ? t("attendance.lateDeductionToday", {
                amount: formatLateDeductionAmount(
                  todayHit.amount,
                  locale,
                  todayHit.currency
                ),
                fraction: chargeLabel(todayHit),
              })
            : t("attendance.lateDeductionTodayFraction", {
                fraction: chargeLabel(todayHit),
              })}
        </p>
      ) : null}
      {summary.count > 0 ? (
        <p className="mt-1 text-sm tabular-nums text-rose-900 dark:text-rose-50">
          {summary.hasAmount
            ? t("attendance.lateDeductionMonthTotal", {
                count: summary.count,
                amount: formatLateDeductionAmount(summary.amount, locale),
              })
            : t("attendance.lateDeductionMonthCount", { count: summary.count })}
        </p>
      ) : null}
    </section>
  );
}
