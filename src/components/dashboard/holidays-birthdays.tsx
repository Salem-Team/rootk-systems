"use client";

import { format, parseISO } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { motion, useReducedMotion } from "framer-motion";
import { Cake, PartyPopper } from "lucide-react";
import { DepartmentBadge } from "@/components/employees/department-badge";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { demoTodayKey } from "@/lib/mock-date";
import type { BirthdayItem } from "@/components/dashboard/dashboard-mock-data";
import type { Holiday } from "@/types";

export function HolidaysPanel({ holidays }: { holidays: Holiday[] }) {
  const { t, locale } = useTranslation();
  const reduceMotion = useReducedMotion();
  const dateLocale = locale === "ar" ? arLocale : enUS;
  const upcoming = holidays
    .filter((h) => h.date >= demoTodayKey())
    .slice(0, 5);

  return (
    <motion.section
      variants={fadeInUp}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      className="surface-panel overflow-hidden"
      aria-labelledby="holidays-heading"
    >
      <div className="panel-header">
        <h3
          id="holidays-heading"
          className="flex items-center gap-2 text-[0.95rem] font-semibold tracking-tight"
        >
          <PartyPopper className="h-3.5 w-3.5 text-primary" aria-hidden />
          {t("dashboard.upcomingHolidays")}
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {t("dashboard.upcomingHolidaysDesc")}
        </p>
      </div>
      <motion.ul
        variants={staggerContainer}
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
        className="panel-body space-y-2"
      >
        {upcoming.length === 0 ? (
          <li className="text-sm text-muted-foreground">
            {t("dashboard.noUpcomingHolidays")}
          </li>
        ) : (
          upcoming.map((h) => (
            <motion.li
              key={h.id}
              variants={fadeInUp}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold">{h.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {h.type === "holiday"
                    ? t("schedule.holiday")
                    : t("schedule.event")}
                </p>
              </div>
              <time
                className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground"
                dateTime={h.date}
              >
                {format(parseISO(h.date), "MMM d", { locale: dateLocale })}
              </time>
            </motion.li>
          ))
        )}
      </motion.ul>
    </motion.section>
  );
}

export function BirthdaysPanel({ items }: { items: BirthdayItem[] }) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      variants={fadeInUp}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      className="surface-panel overflow-hidden"
      aria-labelledby="birthdays-heading"
    >
      <div className="panel-header">
        <h3
          id="birthdays-heading"
          className="flex items-center gap-2 text-[0.95rem] font-semibold tracking-tight"
        >
          <Cake className="h-3.5 w-3.5 text-primary" aria-hidden />
          {t("dashboard.birthdays")}
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {t("dashboard.birthdaysDesc")}
        </p>
      </div>
      <motion.ul
        variants={staggerContainer}
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
        className="panel-body space-y-2"
      >
        {items.map((item) => (
          <motion.li
            key={item.id}
            variants={fadeInUp}
            className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold">{item.name}</p>
              <div className="mt-1">
                <DepartmentBadge department={item.department} />
              </div>
            </div>
            <div className="text-end">
              <p className="text-xs font-medium">{item.dateLabel}</p>
              <p className="text-[10px] text-muted-foreground">
                {item.daysAway === 0
                  ? t("dashboard.today")
                  : t("dashboard.inDays", { count: item.daysAway })}
              </p>
            </div>
          </motion.li>
        ))}
      </motion.ul>
    </motion.section>
  );
}
