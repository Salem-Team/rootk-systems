"use client";

import { motion } from "framer-motion";
import { Building2, Home, Palmtree } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { formatClockRange } from "@/lib/format-time";
import { cn } from "@/lib/utils";
import type { TranslationPath } from "@/i18n";
import type { DayOfWeek, WorkSchedule } from "@/types";

const WEEK_ORDER: DayOfWeek[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const DAY_SHORT: Record<DayOfWeek, TranslationPath> = {
  sunday: "days.sun",
  monday: "days.mon",
  tuesday: "days.tue",
  wednesday: "days.wed",
  thursday: "days.thu",
  friday: "days.fri",
  saturday: "days.sat",
};

type DayKind = "working" | "wfh" | "weekend";

function getDayKind(day: DayOfWeek, schedule: WorkSchedule): DayKind {
  if (schedule.wfhDays.includes(day)) return "wfh";
  if (schedule.weekendDays.includes(day)) return "weekend";
  if (schedule.workingDays.includes(day)) return "working";
  return "weekend";
}

const KIND_META: Record<
  DayKind,
  {
    card: string;
    badge: string;
    icon: typeof Building2;
    labelKey: TranslationPath;
  }
> = {
  working: {
    card: "border-primary/25 bg-primary/10",
    badge:
      "border-primary/30 bg-primary/15 text-primary dark:border-primary/40 dark:bg-primary/20",
    icon: Building2,
    labelKey: "schedule.workingDay",
  },
  wfh: {
    card: "border-sky-300 bg-sky-50 dark:border-sky-700 dark:bg-sky-950/40",
    badge:
      "border-sky-300 bg-sky-100 text-sky-950 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-100",
    icon: Home,
    labelKey: "schedule.wfhDay",
  },
  weekend: {
    card: "border-border bg-muted/50",
    badge: "border-border bg-muted text-foreground/80",
    icon: Palmtree,
    labelKey: "schedule.weekend",
  },
};

interface WeeklyPlannerProps {
  schedule: WorkSchedule;
}

export function WeeklyPlanner({ schedule }: WeeklyPlannerProps) {
  const { t, locale } = useTranslation();
  const hoursLabel = formatClockRange(
    schedule.fromTime,
    schedule.toTime,
    locale
  );

  return (
    <section className="surface-panel overflow-hidden">
      <div className="panel-header">
        <h3 className="text-[0.95rem] font-semibold tracking-tight">
          {t("schedule.weeklyPlanner")}
        </h3>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
          <span className="hidden sm:inline">
            {t("schedule.weeklyPlannerDesc")} ·{" "}
          </span>
          <span className="tabular-nums">{hoursLabel}</span>
          <span className="mx-1.5 text-border">·</span>
          <span>
            {schedule.gracePeriodMinutes}
            {t("attendance.minutes")} {t("schedule.gracePeriod")}
          </span>
        </p>
      </div>

      <div className="p-3 sm:p-4">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className={cn(
            "-mx-3 flex gap-2.5 overflow-x-auto px-3 pb-1 [scrollbar-width:none]",
            "snap-x snap-mandatory scroll-ps-3",
            "sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-3 sm:overflow-visible sm:px-0 sm:pb-0 sm:snap-none",
            "lg:grid-cols-4 xl:grid-cols-7",
            "[&::-webkit-scrollbar]:hidden"
          )}
        >
          {WEEK_ORDER.map((day) => {
            const kind = getDayKind(day, schedule);
            const style = KIND_META[kind];
            const Icon = style.icon;

            return (
              <motion.div
                key={day}
                variants={fadeInUp}
                className={cn(
                  "relative flex w-[min(9.25rem,72vw)] shrink-0 snap-start flex-col gap-2 rounded-xl border p-3 transition-[border-color,box-shadow] duration-200",
                  "hover:border-primary/25 sm:w-auto sm:gap-2.5 sm:p-3.5",
                  style.card
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-[11px]">
                      {t(DAY_SHORT[day])}
                    </p>
                    <p className="mt-0.5 truncate text-[13px] font-semibold leading-tight">
                      {t(`days.${day}`)}
                    </p>
                  </div>
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg sm:h-8 sm:w-8 sm:rounded-md",
                      kind === "working" && "bg-primary/12 text-primary",
                      kind === "wfh" &&
                        "bg-sky-500/15 text-sky-700 dark:text-sky-300",
                      kind === "weekend" && "bg-muted text-muted-foreground"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className={cn(
                    "h-6 w-fit max-w-full truncate border px-2 text-[10px] font-medium sm:text-[11px]",
                    style.badge
                  )}
                >
                  {t(style.labelKey)}
                </Badge>

                <p className="mt-auto text-[11px] tabular-nums text-muted-foreground sm:text-xs">
                  {kind !== "weekend" ? hoursLabel : t("schedule.weekend")}
                </p>
              </motion.div>
            );
          })}
        </motion.div>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-border/50 pt-3 text-[11px] text-muted-foreground sm:mt-4 sm:gap-x-4 sm:pt-3.5 sm:text-xs">
          <LegendDot className="bg-primary" label={t("schedule.workingDays")} />
          <LegendDot className="bg-sky-500" label={t("schedule.wfhDays")} />
          <LegendDot
            className="bg-muted-foreground"
            label={t("schedule.weekendDays")}
          />
        </div>
      </div>
    </section>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 sm:gap-2">
      <span className={cn("h-2 w-2 shrink-0 rounded-full", className)} />
      <span className="leading-none">{label}</span>
    </span>
  );
}
