"use client";

import { DailyReportResults } from "@/components/daily-plan/daily-report-view";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useTranslation } from "@/hooks/use-translation";
import type { DailyReportRow } from "@/types";

export function DailyReportSheet({
  open,
  onOpenChange,
  date,
  onDateChange,
  loading,
  report,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  onDateChange: (date: string) => void;
  loading: boolean;
  report: { date: string; rows: DailyReportRow[] } | null;
  error: string | null;
}) {
  const { t } = useTranslation();
  const rows = report?.rows ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-w-5xl px-4 sm:px-6">
        <SheetHeader>
          <SheetTitle>{t("dailyPlan.reportTitle")}</SheetTitle>
          <SheetDescription className="text-[13px] sm:text-sm">
            <span className="sm:hidden">{t("dailyPlan.reportDescShort")}</span>
            <span className="hidden sm:inline">{t("dailyPlan.reportDesc")}</span>
          </SheetDescription>
        </SheetHeader>

        <div className="sticky top-0 z-[2] -mx-4 mt-4 border-b border-border/70 bg-card/95 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
          <div className="flex flex-col gap-2 min-[420px]:flex-row min-[420px]:items-end min-[420px]:justify-between">
            <div className="grid w-full gap-1.5 min-[420px]:max-w-[13rem]">
              <Label htmlFor="daily-report-date">{t("dailyPlan.reportDate")}</Label>
              <Input
                id="daily-report-date"
                type="date"
                value={date}
                onChange={(e) => onDateChange(e.target.value)}
                className="h-11 w-full text-base sm:h-9 sm:text-sm"
              />
            </div>
            {rows.length > 0 && !loading ? (
              <p className="text-[13px] text-muted-foreground">
                {t("dailyPlan.reportCount", { count: rows.length })}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-4 pb-2">
          <DailyReportResults loading={loading} error={error} rows={rows} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
