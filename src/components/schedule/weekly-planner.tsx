"use client";

import { motion } from "framer-motion";
import { Building2, Home, Palmtree } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp, staggerContainer } from "@/lib/animations";
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
  { card: string; badge: string; icon: typeof Building2; labelKey: TranslationPath }
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
  const { t } = useTranslation();

  return (
    <section className="surface-panel overflow-hidden">
      <div className="panel-header">
        <h3 className="text-[0.95rem] font-semibold">{t("schedule.weeklyPlanner")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("schedule.weeklyPlannerDesc")} · {schedule.fromTime} – {schedule.toTime} ·{" "}
          {schedule.gracePeriodMinutes}
          {t("attendance.minutes")} {t("schedule.gracePeriod")}
        </p>
      </div>
      <div>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 [scrollbar-width:none] sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 sm:snap-none lg:grid-cols-4 xl:grid-cols-7 [&::-webkit-scrollbar]:hidden"
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
                  "relative flex w-[9.5rem] shrink-0 snap-start flex-col gap-3 rounded-xl border p-3.5 transition-[border-color,box-shadow] duration-200 hover:border-primary/20 sm:w-auto",
                  style.card
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      {t(DAY_SHORT[day])}
                    </p>
                    <p className="mt-0.5 text-[13px] font-semibold">{t(`days.${day}`)}</p>
                  </div>
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-md",
                      kind === "working" && "bg-primary/12 text-primary",
                      kind === "wfh" && "bg-sky-500/15 text-sky-700 dark:text-sky-300",
                      kind === "weekend" && "bg-muted text-muted-foreground"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                </div>
                <Badge variant="outline" className={cn("w-fit border font-medium", style.badge)}>
                  {t(style.labelKey)}
                </Badge>
                {kind !== "weekend" ? (
                  <p className="text-xs text-muted-foreground">
                    {schedule.fromTime} – {schedule.toTime}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">{t("schedule.weekend")}</p>
                )}
              </motion.div>
            );
          })}
        </motion.div>

        <div className="mt-6 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <LegendDot className="bg-primary" label={t("schedule.workingDays")} />
          <LegendDot className="bg-sky-500" label={t("schedule.wfhDays")} />
          <LegendDot className="bg-muted-foreground" label={t("schedule.weekendDays")} />
        </div>
      </div>
    </section>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={cn("h-2 w-2 rounded-full", className)} />
      {label}
    </span>
  );
}
