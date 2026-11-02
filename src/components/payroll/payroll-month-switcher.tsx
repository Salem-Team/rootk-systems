"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";

export function shiftPayrollPeriod(periodId: string, delta: number): string {
  const [y, m] = periodId.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function formatPayrollPeriodLabel(periodId: string, locale: string) {
  const [y, m] = periodId.split("-").map(Number);
  if (!y || !m) return periodId;
  try {
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(y, m - 1, 1)));
  } catch {
    return periodId;
  }
}

export function PayrollMonthSwitcher({
  periodId,
  onPeriodIdChange,
  disabled = false,
  className,
  compact = false,
}: {
  periodId: string;
  onPeriodIdChange: (periodId: string) => void;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
}) {
  const { t, locale } = useTranslation();

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-xl border border-border/70 bg-card/80 p-1 shadow-sm",
        className
      )}
      role="group"
      aria-label={t("payroll.currentPeriod")}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn("shrink-0", compact ? "h-8 w-8" : "h-9 w-9")}
        aria-label={t("payroll.prevMonth")}
        disabled={disabled}
        onClick={() => onPeriodIdChange(shiftPayrollPeriod(periodId, -1))}
      >
        <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
      </Button>
      <div className={cn("min-w-0 text-center", compact ? "px-1" : "min-w-[9rem] px-2")}>
        <p className="truncate text-[13px] font-semibold tracking-tight sm:text-[14px]">
          {formatPayrollPeriodLabel(periodId, locale)}
        </p>
        {!compact ? (
          <p className="text-[10px] tabular-nums text-muted-foreground">{periodId}</p>
        ) : null}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn("shrink-0", compact ? "h-8 w-8" : "h-9 w-9")}
        aria-label={t("payroll.nextMonth")}
        disabled={disabled}
        onClick={() => onPeriodIdChange(shiftPayrollPeriod(periodId, 1))}
      >
        <ChevronRight className="h-4 w-4 rtl:rotate-180" />
      </Button>
    </div>
  );
}
