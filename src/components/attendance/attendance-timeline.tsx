"use client";

import { format, parseISO } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { motion, useReducedMotion } from "framer-motion";
import {
  Briefcase,
  Building2,
  Clock,
  Coffee,
  Home,
  LogOut,
  Timer,
  Users,
} from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { SoftListRow } from "@/components/shared/meta-chip";
import { SectionPanel } from "@/components/shared/section-panel";
import { buildWorkdayTimeline } from "@/components/attendance/attendance-mock-data";
import { useAttendanceStore } from "@/stores/attendance-store";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { cn } from "@/lib/utils";
import type { TranslationPath } from "@/i18n";

const META = {
  arrived: {
    icon: Building2,
    tone: "border border-emerald-300 bg-emerald-100 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100",
  },
  wfh: {
    icon: Home,
    tone: "border border-sky-300 bg-sky-100 text-sky-950 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-100",
  },
  started: {
    icon: Briefcase,
    tone: "border border-primary/25 bg-primary/15 text-primary",
  },
  break_start: {
    icon: Coffee,
    tone: "border border-amber-400 bg-amber-100 text-amber-950 dark:border-amber-600 dark:bg-amber-950 dark:text-amber-100",
  },
  break_end: {
    icon: Coffee,
    tone: "border border-amber-400 bg-amber-100 text-amber-950 dark:border-amber-600 dark:bg-amber-950 dark:text-amber-100",
  },
  meeting: {
    icon: Users,
    tone: "border border-teal-300 bg-teal-100 text-teal-950 dark:border-teal-700 dark:bg-teal-950 dark:text-teal-100",
  },
  check_out: {
    icon: LogOut,
    tone: "border border-border bg-secondary text-secondary-foreground",
  },
  late: {
    icon: Timer,
    tone: "border border-orange-300 bg-orange-100 text-orange-950 dark:border-orange-700 dark:bg-orange-950 dark:text-orange-100",
  },
} as const;

export function AttendanceTimeline() {
  const { t, locale } = useTranslation();
  const reduceMotion = useReducedMotion();
  const dateLocale = locale === "ar" ? arLocale : enUS;
  const todayRecord = useAttendanceStore((s) => s.todayRecord);
  const events = buildWorkdayTimeline(todayRecord);

  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      className="h-full"
    >
      <SectionPanel
        className="h-full"
        title={t("attendance.timeline")}
        description={t("attendance.timelineDesc")}
      >
        {events.length === 0 ? (
          <EmptyState
            compact
            icon={Clock}
            title={t("attendance.timelineEmpty")}
            description={t("attendance.timelineEmptyDesc")}
          />
        ) : (
          <motion.ol
            variants={staggerContainer}
            initial={reduceMotion ? false : "hidden"}
            animate="visible"
            className="relative space-y-0"
            aria-label={t("attendance.timeline")}
          >
            <span
              aria-hidden
              className="absolute bottom-2 start-[15px] top-2 w-px bg-border"
            />
            {events.map((event) => {
              const meta = META[event.type];
              const Icon = meta.icon;
              return (
                <motion.li
                  key={event.id}
                  variants={fadeInUp}
                  className="relative flex gap-3 pb-4 last:pb-0"
                >
                  <span
                    className={cn(
                      "relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-card",
                      meta.tone
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <SoftListRow className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold">
                          {t(event.titleKey as TranslationPath)}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {t(event.detailKey as TranslationPath)}
                        </p>
                      </div>
                      <time
                        className="shrink-0 font-mono text-[11px] text-muted-foreground"
                        dateTime={event.at}
                      >
                        {format(parseISO(event.at), "h:mm a", {
                          locale: dateLocale,
                        })}
                      </time>
                    </div>
                  </SoftListRow>
                </motion.li>
              );
            })}
          </motion.ol>
        )}
      </SectionPanel>
    </motion.div>
  );
}
