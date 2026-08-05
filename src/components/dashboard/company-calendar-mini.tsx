"use client";

import { useMemo } from "react";
import {
  eachDayOfInterval,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
} from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { motion, useReducedMotion } from "framer-motion";
import { CalendarDays } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp } from "@/lib/animations";
import { demoNow, demoTodayKey } from "@/lib/mock-date";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/components/dashboard/dashboard-mock-data";

const KIND_DOT: Record<CalendarEvent["kind"], string> = {
  attendance: "bg-primary",
  leave: "bg-violet-500",
  birthday: "bg-rose-500",
  event: "bg-amber-500",
  holiday: "bg-slate-500",
};

export function CompanyCalendarMini({
  events,
}: {
  events: CalendarEvent[];
}) {
  const { t, locale } = useTranslation();
  const reduceMotion = useReducedMotion();
  const dateLocale = locale === "ar" ? arLocale : enUS;
  const monthKey = format(demoNow(), "yyyy-MM");
  const todayStr = demoTodayKey();

  const days = useMemo(() => {
    const month = parseISO(`${monthKey}-01`);
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const byDate = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const list = byDate.get(e.date) ?? [];
      list.push(e);
      byDate.set(e.date, list);
    }
    const pad = start.getDay();
    const cells: {
      date: string;
      inMonth: boolean;
      events: CalendarEvent[];
      isToday: boolean;
    }[] = [];
    for (let i = 0; i < pad; i += 1) {
      cells.push({ date: `pad-${i}`, inMonth: false, events: [], isToday: false });
    }
    for (const d of eachDayOfInterval({ start, end })) {
      const date = format(d, "yyyy-MM-dd");
      cells.push({
        date,
        inMonth: true,
        events: byDate.get(date) ?? [],
        isToday: date === todayStr,
      });
    }
    return cells;
  }, [events, monthKey, todayStr]);

  const upcoming = events
    .filter((e) => e.date >= todayStr)
    .slice(0, 5);

  return (
    <motion.section
      variants={fadeInUp}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      className="surface-panel overflow-hidden"
      aria-labelledby="company-cal-heading"
    >
      <div className="panel-header">
        <h3
          id="company-cal-heading"
          className="flex items-center gap-2 text-[0.95rem] font-semibold tracking-tight"
        >
          <CalendarDays className="h-3.5 w-3.5 text-primary" aria-hidden />
          {t("dashboard.companyCalendar")}
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {format(parseISO(`${monthKey}-01`), "MMMM yyyy", { locale: dateLocale })} ·{" "}
          {t("dashboard.companyCalendarDesc")}
        </p>
      </div>
      <div className="panel-body space-y-4">
        <div
          className="grid grid-cols-7 gap-1"
          role="grid"
          aria-label={t("dashboard.companyCalendar")}
        >
          {[
            t("days.sun"),
            t("days.mon"),
            t("days.tue"),
            t("days.wed"),
            t("days.thu"),
            t("days.fri"),
            t("days.sat"),
          ].map((d) => (
            <div
              key={d}
              className="pb-1 text-center text-[9px] font-medium uppercase text-muted-foreground"
            >
              {d}
            </div>
          ))}
          {days.map((cell) => (
            <div
              key={cell.date}
              role="gridcell"
              className={cn(
                "aspect-square rounded-md border border-transparent p-0.5 text-center text-[10px] tabular-nums",
                cell.inMonth
                  ? "bg-muted/30 text-foreground"
                  : "text-muted-foreground/30",
                cell.isToday && "border-primary/40 bg-primary/[0.08] font-semibold"
              )}
            >
              {cell.inMonth ? format(parseISO(cell.date), "d") : ""}
              <div className="mt-0.5 flex justify-center gap-0.5">
                {cell.events.slice(0, 3).map((e) => (
                  <span
                    key={e.id}
                    className={cn("h-1 w-1 rounded-full", KIND_DOT[e.kind])}
                    aria-hidden
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <ul className="space-y-2" aria-label={t("dashboard.upcomingEvents")}>
          {upcoming.map((e) => (
            <li
              key={e.id}
              className="flex items-center gap-2 rounded-lg border border-border/60 px-2.5 py-2 text-xs"
            >
              <span
                className={cn("h-2 w-2 rounded-full", KIND_DOT[e.kind])}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate font-medium">{e.title}</span>
              <time className="shrink-0 text-muted-foreground" dateTime={e.date}>
                {format(parseISO(e.date), "MMM d", { locale: dateLocale })}
              </time>
            </li>
          ))}
        </ul>
      </div>
    </motion.section>
  );
}
