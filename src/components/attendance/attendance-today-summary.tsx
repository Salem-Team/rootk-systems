"use client";

import { Coffee, LogIn, LogOut, Timer } from "lucide-react";
import { formatTime } from "@/components/attendance/use-check-in-panel";
import { formatHmDuration } from "@/lib/duration-format";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import type { AttendanceRecord } from "@/types";
import type { Locale } from "date-fns";

export function AttendanceTodaySummary({
  todayRecord,
  hoursDisplay,
  scheduleBreak,
  dateLocale,
  isLive,
}: {
  todayRecord: AttendanceRecord | null;
  hoursDisplay: string;
  scheduleBreak: number;
  dateLocale: Locale;
  isLive: boolean;
}) {
  const { t } = useTranslation();
  const breakMinutes =
    todayRecord?.breakAppliedMinutes ??
    (todayRecord?.checkOut ? scheduleBreak : 0);

  const tiles = [
    {
      key: "in",
      label: t("attendance.checkIn"),
      value: formatTime(todayRecord?.checkIn, dateLocale),
      icon: LogIn,
      tone: "bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-900",
    },
    {
      key: "out",
      label: t("attendance.checkOut"),
      value: formatTime(todayRecord?.checkOut, dateLocale),
      icon: LogOut,
      tone: "bg-rose-50 text-rose-800 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-900",
    },
    {
      key: "hours",
      label: t("attendance.workingHours"),
      value: hoursDisplay,
      icon: Timer,
      tone: "bg-sky-50 text-sky-800 border-sky-200/80 dark:bg-sky-950/40 dark:text-sky-200 dark:border-sky-900",
      live: isLive,
    },
    {
      key: "break",
      label: t("attendance.breakDuration"),
      value: breakMinutes > 0 ? formatHmDuration(breakMinutes, t) : "—",
      icon: Coffee,
      tone: "bg-amber-50 text-amber-900 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-100 dark:border-amber-900",
    },
  ] as const;

  return (
    <section className="surface-panel overflow-hidden">
      <div className="panel-header">
        <h3 className="text-[0.95rem] font-semibold tracking-tight">
          {t("attendance.todaySummary")}
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {t("attendance.todaySummaryDesc")}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2.5 p-3 sm:p-4">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <div
              key={tile.key}
              className={cn(
                "rounded-xl border px-3 py-3",
                tile.tone
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium opacity-80">{tile.label}</p>
                <Icon className="h-3.5 w-3.5 opacity-70" aria-hidden />
              </div>
              <p className="mt-2 font-mono text-lg font-semibold tabular-nums tracking-tight">
                {tile.value}
              </p>
              {"live" in tile && tile.live ? (
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide opacity-70">
                  {t("attendance.liveBadge")}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
