"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MetaChip } from "@/components/shared/meta-chip";
import type { WorkMode } from "@/components/attendance/attendance-mock-data";
import {
  formatTime,
  type MetricItem,
} from "@/components/attendance/use-check-in-panel";
import { useTranslation } from "@/hooks/use-translation";
import { easeOutExpo, fadeInUp, staggerFast } from "@/lib/animations";
import { cn } from "@/lib/utils";
import type { AttendanceRecord, AttendanceStatus } from "@/types";

export function CheckInMetrics({
  metricItems,
  isLive,
  hoursDisplay,
  todayRecord,
  workMode,
  statusDisplay,
  dateLocale,
}: {
  metricItems: MetricItem[];
  isLive: boolean;
  hoursDisplay: string;
  todayRecord: AttendanceRecord | null;
  workMode: WorkMode;
  statusDisplay: AttendanceStatus;
  dateLocale: Parameters<typeof formatTime>[1];
}) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

  return (
    <>
      {/* Mobile: timer-first composition */}
      <div className="sm:hidden">
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl border px-4 py-5 text-center",
            isLive
              ? "border-emerald-500/25 bg-gradient-to-b from-emerald-500/[0.08] to-muted/20"
              : todayRecord?.checkOut
                ? "border-primary/15 bg-gradient-to-b from-primary/[0.06] to-muted/20"
                : "border-border/70 bg-gradient-to-b from-muted/40 to-muted/15"
          )}
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {isLive
              ? t("attendance.liveTimer")
              : todayRecord?.checkOut
                ? t("attendance.sessionComplete")
                : t("attendance.workingHoursToday")}
          </p>
          <AnimatePresence mode="wait">
            <motion.p
              key={hoursDisplay}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: easeOutExpo }}
              className="mt-2 font-mono text-[2.35rem] font-semibold leading-none tracking-tight tabular-nums"
            >
              {hoursDisplay}
            </motion.p>
          </AnimatePresence>
          {isLive ? (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-600 dark:bg-emerald-400" />
              {t("attendance.liveBadge")} ·{" "}
              {formatTime(todayRecord?.checkIn, dateLocale)}
            </p>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              {t(`attendance.workMode.${workMode}`)} ·{" "}
              {t(`status.${statusDisplay}`)}
            </p>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {metricItems
            .filter((m) => m.key === "in" || m.key === "expected")
            .map((item) => (
              <MetaChip
                key={item.key}
                label={item.label}
                value={
                  <span className="font-mono text-sm tabular-nums">
                    {item.value}
                  </span>
                }
              />
            ))}
        </div>
      </div>

      {/* Desktop / tablet: full metric grid */}
      <motion.div
        variants={staggerFast}
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
        className="hidden gap-2.5 sm:grid sm:grid-cols-2 lg:grid-cols-3"
      >
        {metricItems.map((item) => (
          <motion.div
            key={item.key}
            variants={fadeInUp}
            className={cn(
              "kpi-tile px-3.5 py-3",
              item.live && "border-emerald-500/20 ring-1 ring-emerald-500/15"
            )}
          >
            <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              {item.label}
              {item.live ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-600 dark:bg-emerald-400" />
                  {t("attendance.liveBadge")}
                </span>
              ) : null}
            </p>
            <AnimatePresence mode="wait">
              <motion.p
                key={String(item.value)}
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.22, ease: easeOutExpo }}
                className={cn(
                  "stat-value mt-1.5 text-lg",
                  item.mono && "font-mono"
                )}
              >
                {item.value}
              </motion.p>
            </AnimatePresence>
          </motion.div>
        ))}
      </motion.div>
    </>
  );
}
