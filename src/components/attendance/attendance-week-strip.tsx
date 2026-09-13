"use client";

import { format, parseISO, subDays } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { Check, X } from "lucide-react";
import { buildWeeklySummary } from "@/components/attendance/attendance-mock-data";
import { demoNow, demoTodayKey } from "@/lib/mock-date";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import type { AttendanceRecord, AttendanceStatus } from "@/types";

function dayKind(
  record: AttendanceRecord | undefined,
  isWeekend: boolean
): "present" | "late" | "absent" | "leave" | "empty" | "today" {
  if (!record) return isWeekend ? "empty" : "absent";
  if (record.status === "on_leave") return "leave";
  if (record.isLate || record.status === "late") return "late";
  if (
    ["present", "wfh", "early_leave", "half_day"].includes(record.status)
  ) {
    return "present";
  }
  if (record.status === "absent") return "absent";
  return "empty";
}

export function AttendanceWeekStrip({
  records,
}: {
  records: AttendanceRecord[];
}) {
  const { t, locale } = useTranslation();
  const dateLocale = locale === "ar" ? arLocale : enUS;
  const summary = buildWeeklySummary(records);
  const leaveDays = records.filter((r) => {
    const d = parseISO(r.date);
    const weekStart = subDays(demoNow(), 6);
    return (
      d >= weekStart &&
      d <= demoNow() &&
      r.status === "on_leave"
    );
  }).length;
  const todayKey = demoTodayKey();
  const today = demoNow();

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(today, 6 - i);
    const key = format(date, "yyyy-MM-dd");
    const record = records.find((r) => r.date === key);
    const dow = date.getDay();
    const isWeekend = dow === 5 || dow === 6; // Fri/Sat company weekend default
    const kind = dayKind(record, isWeekend);
    const isToday = key === todayKey;
    return {
      key,
      label: format(date, "EEE", { locale: dateLocale }),
      dayNum: format(date, "d"),
      kind: isToday ? ("today" as const) : kind,
      status: record?.status as AttendanceStatus | undefined,
    };
  });

  const legend = [
    {
      label: t("status.present"),
      count: summary.presentDays,
      dot: "bg-emerald-500",
    },
    {
      label: t("status.absent"),
      count: summary.absentDays,
      dot: "bg-rose-500",
    },
    {
      label: t("status.late"),
      count: summary.lateDays,
      dot: "bg-amber-500",
    },
    {
      label: t("status.on_leave"),
      count: leaveDays,
      dot: "bg-sky-500",
    },
  ];

  return (
    <section className="surface-panel overflow-hidden">
      <div className="panel-header">
        <h3 className="text-[0.95rem] font-semibold tracking-tight">
          {t("attendance.thisWeek")}
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {t("attendance.thisWeekDesc")}
        </p>
        <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
          {legend.map((item) => (
            <li
              key={item.label}
              className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", item.dot)} />
              <span>{item.label}</span>
              <span className="font-semibold tabular-nums text-foreground">
                {item.count}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-7 gap-1.5 p-3 sm:gap-2 sm:p-4">
        {days.map((day) => (
          <div
            key={day.key}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-xl border px-1 py-2.5",
              day.kind === "today" &&
                "border-primary bg-primary text-primary-foreground shadow-sm",
              day.kind === "present" &&
                "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40",
              day.kind === "late" &&
                "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40",
              day.kind === "absent" &&
                "border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40",
              day.kind === "leave" &&
                "border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/40",
              day.kind === "empty" &&
                "border-transparent bg-muted/30 text-muted-foreground"
            )}
          >
            <span
              className={cn(
                "text-[10px] font-medium uppercase",
                day.kind === "today"
                  ? "text-primary-foreground/80"
                  : "text-muted-foreground"
              )}
            >
              {day.label}
            </span>
            <span className="text-sm font-semibold tabular-nums">
              {day.dayNum}
            </span>
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full",
                day.kind === "today" && "bg-white/20",
                day.kind === "present" && "bg-emerald-500/15 text-emerald-700",
                day.kind === "late" && "bg-amber-500/15 text-amber-700",
                day.kind === "absent" && "bg-rose-500/15 text-rose-700",
                day.kind === "leave" && "bg-sky-500/15 text-sky-700",
                day.kind === "empty" && "text-muted-foreground/50"
              )}
            >
              {day.kind === "absent" || day.kind === "empty" ? (
                <X className="h-3 w-3" aria-hidden />
              ) : (
                <Check className="h-3 w-3" aria-hidden />
              )}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
