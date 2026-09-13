"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  format,
  parseISO,
  subMonths,
} from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Clock3, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  buildCalendarMonth,
  type CalendarDayKind,
} from "@/components/attendance/attendance-mock-data";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp } from "@/lib/animations";
import { demoNow, demoTodayKey } from "@/lib/mock-date";
import { cn, formatHours } from "@/lib/utils";
import type { AttendanceRecord } from "@/types";

const KIND_STYLE: Record<CalendarDayKind, string> = {
  present: "border-emerald-300 bg-emerald-100 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100",
  late: "border-amber-400 bg-amber-100 text-amber-950 dark:border-amber-600 dark:bg-amber-950 dark:text-amber-100",
  absent: "border-rose-300 bg-rose-100 text-rose-950 dark:border-rose-700 dark:bg-rose-950 dark:text-rose-100",
  leave: "border-violet-300 bg-violet-100 text-violet-950 dark:border-violet-700 dark:bg-violet-950 dark:text-violet-100",
  wfh: "border-sky-300 bg-sky-100 text-sky-950 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-100",
  holiday: "bg-muted text-muted-foreground border-border",
  empty: "bg-transparent text-muted-foreground/40 border-transparent",
  today: "bg-primary text-primary-foreground border-primary",
};

interface AttendanceCalendarProps {
  records: AttendanceRecord[];
}

function formatTime(iso: string | undefined, dateLocale: typeof enUS): string {
  if (!iso) return "—";
  return format(parseISO(iso), "h:mm a", { locale: dateLocale });
}

export function AttendanceCalendar({ records }: AttendanceCalendarProps) {
  const { t, locale } = useTranslation();
  const reduceMotion = useReducedMotion();
  const dateLocale = locale === "ar" ? arLocale : enUS;
  const [month, setMonth] = useState(() => demoNow());
  const [selectedDate, setSelectedDate] = useState(() => demoTodayKey());

  const recordsByDate = useMemo(
    () => new Map(records.map((record) => [record.date, record])),
    [records]
  );

  const days = useMemo(
    () => buildCalendarMonth(records, month),
    [records, month]
  );

  const selectedRecord = recordsByDate.get(selectedDate);
  const selectedLabel = format(parseISO(selectedDate), "EEEE, d MMM yyyy", {
    locale: dateLocale,
  });

  const weekdays = [
    t("days.sun"),
    t("days.mon"),
    t("days.tue"),
    t("days.wed"),
    t("days.thu"),
    t("days.fri"),
    t("days.sat"),
  ];

  const legend: { kind: CalendarDayKind; label: string }[] = [
    { kind: "present", label: t("status.present") },
    { kind: "late", label: t("status.late") },
    { kind: "absent", label: t("status.absent") },
    { kind: "leave", label: t("status.on_leave") },
    { kind: "wfh", label: t("status.wfh") },
    { kind: "holiday", label: t("attendance.legendHoliday") },
  ];

  return (
    <motion.div
      variants={fadeInUp}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
    >
      <section className="surface-panel overflow-hidden">
        <div className="panel-header space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-[0.95rem] font-semibold">{t("attendance.calendarTitle")}</h3>
              <p className="text-sm text-muted-foreground">{t("attendance.calendarDesc")}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                onClick={() => setMonth((m) => subMonths(m, 1))}
                aria-label={t("attendance.prevMonth")}
              >
                <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
              </Button>
              <p className="min-w-[9rem] text-center text-sm font-semibold">
                {format(month, "MMMM yyyy", { locale: dateLocale })}
              </p>
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                onClick={() => setMonth((m) => addMonths(m, 1))}
                aria-label={t("attendance.nextMonth")}
              >
                <ChevronRight className="h-4 w-4 rtl:rotate-180" />
              </Button>
            </div>
          </div>
        </div>
        <div className="panel-body space-y-3 sm:space-y-4">
          <div
            className="grid grid-cols-7 gap-1 sm:gap-1.5"
            role="grid"
            aria-label={t("attendance.calendarTitle")}
          >
            {weekdays.map((day) => (
              <div
                key={day}
                role="columnheader"
                className="truncate px-0.5 pb-1 text-center text-[9px] font-medium uppercase tracking-wide text-muted-foreground sm:px-1 sm:text-[10px]"
              >
                {day}
              </div>
            ))}
            {days.map((day) => {
              const kind = day.isToday ? "today" : day.kind;
              const label = format(parseISO(day.date), "d");
              const isSelected = day.inMonth && day.date === selectedDate;
              return (
                <motion.button
                  key={day.date}
                  type="button"
                  role="gridcell"
                  aria-selected={isSelected}
                  whileHover={
                    reduceMotion || !day.inMonth
                      ? undefined
                      : { scale: 1.04 }
                  }
                  className={cn(
                    "aspect-square rounded-lg border text-xs font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    day.inMonth ? KIND_STYLE[kind] : KIND_STYLE.empty,
                    day.isToday &&
                      "ring-2 ring-primary/40 ring-offset-1 ring-offset-background",
                    isSelected && "outline outline-2 outline-offset-1 outline-foreground/70"
                  )}
                  aria-label={`${day.date}${day.isToday ? ` · ${t("attendance.legendToday")}` : ""}`}
                  disabled={!day.inMonth}
                  onClick={() => setSelectedDate(day.date)}
                >
                  {label}
                </motion.button>
              );
            })}
          </div>

          <div
            className="rounded-xl border border-border/70 bg-muted/30 p-3 sm:p-4"
            aria-live="polite"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  {t("attendance.dayDetailTitle")}
                </p>
                <p className="text-sm font-semibold">{selectedLabel}</p>
              </div>
              {selectedRecord ? (
                <StatusBadge status={selectedRecord.status} />
              ) : null}
            </div>
            {selectedRecord?.checkIn || selectedRecord?.checkOut ? (
              <dl className="mt-3 grid gap-2 sm:grid-cols-3">
                <div className="rounded-lg border border-border/60 bg-card px-3 py-2">
                  <dt className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <LogIn className="h-3.5 w-3.5" aria-hidden />
                    {t("attendance.checkIn")}
                  </dt>
                  <dd className="mt-1 font-mono text-sm font-semibold tabular-nums">
                    {formatTime(selectedRecord.checkIn, dateLocale)}
                  </dd>
                </div>
                <div className="rounded-lg border border-border/60 bg-card px-3 py-2">
                  <dt className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <LogOut className="h-3.5 w-3.5" aria-hidden />
                    {t("attendance.checkOut")}
                  </dt>
                  <dd className="mt-1 font-mono text-sm font-semibold tabular-nums">
                    {formatTime(selectedRecord.checkOut, dateLocale)}
                  </dd>
                </div>
                <div className="rounded-lg border border-border/60 bg-card px-3 py-2">
                  <dt className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Clock3 className="h-3.5 w-3.5" aria-hidden />
                    {t("common.hours")}
                  </dt>
                  <dd className="mt-1 font-mono text-sm font-semibold tabular-nums">
                    {selectedRecord.workingMinutes > 0
                      ? formatHours(selectedRecord.workingMinutes)
                      : "—"}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                {t("attendance.dayNoRecord")}
              </p>
            )}
          </div>

          <ul className="flex flex-wrap gap-2" aria-label={t("attendance.legend")}>
            {legend.map((item) => (
              <li
                key={item.kind}
                className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"
              >
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-sm border",
                    KIND_STYLE[item.kind]
                  )}
                  aria-hidden
                />
                {item.label}
              </li>
            ))}
            <li className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span
                className={cn("h-2.5 w-2.5 rounded-sm border", KIND_STYLE.today)}
                aria-hidden
              />
              {t("attendance.legendToday")}
            </li>
          </ul>
        </div>
      </section>
    </motion.div>
  );
}
