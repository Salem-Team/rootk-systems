"use client";

import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Coffee, Timer } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { useTranslation } from "@/hooks/use-translation";
import { easeOutExpo, softSpring } from "@/lib/animations";
import { formatHmDuration } from "@/lib/duration-format";
import {
  cn,
  elapsedSeconds,
  formatLiveDuration,
} from "@/lib/utils";
import type { AttendanceStatus } from "@/types";

interface SessionCardProps {
  checkIn?: string;
  checkOut?: string;
  status?: AttendanceStatus;
  className?: string;
  /** Break minutes applied (or scheduled break for live display). */
  breakMinutes?: number;
  /** Settled net working minutes after checkout. */
  workingMinutes?: number;
  /** Scheduled end ISO for progress against company clock. */
  expectedOutIso?: string | null;
  /** Scheduled net day length in minutes (for progress). */
  scheduledMinutes?: number;
}

export function SessionCard({
  checkIn,
  checkOut,
  status,
  className,
  breakMinutes = 60,
  workingMinutes,
  expectedOutIso,
  scheduledMinutes = 8 * 60,
}: SessionCardProps) {
  const { t, locale } = useTranslation();
  const reduceMotion = useReducedMotion();
  const dateLocale = locale === "ar" ? arLocale : enUS;
  const isLive = Boolean(checkIn && !checkOut);
  const isComplete = Boolean(checkIn && checkOut);
  const [seconds, setSeconds] = useState(() =>
    elapsedSeconds(checkIn, checkOut)
  );

  useEffect(() => {
    setSeconds(elapsedSeconds(checkIn, checkOut));
    if (!isLive) return;
    const id = window.setInterval(() => {
      setSeconds(elapsedSeconds(checkIn));
    }, 1000);
    return () => window.clearInterval(id);
  }, [checkIn, checkOut, isLive]);

  const targetSeconds = useMemo(() => {
    if (checkIn && expectedOutIso) {
      const start = parseISO(checkIn).getTime();
      const end = parseISO(expectedOutIso).getTime();
      const span = Math.max(60, Math.floor((end - start) / 1000));
      return span;
    }
    return Math.max(scheduledMinutes, 1) * 60;
  }, [checkIn, expectedOutIso, scheduledMinutes]);

  const progress = Math.min(1, seconds / targetSeconds);

  if (!checkIn) return null;

  const settledLabel =
    typeof workingMinutes === "number" && workingMinutes > 0
      ? formatHmDuration(workingMinutes, t)
      : formatHmDuration(Math.floor(seconds / 60), t);

  return (
    <motion.div
      layout
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={softSpring}
      className={cn(
        "rounded-xl border border-primary/15 bg-primary/[0.03] p-4 sm:p-5",
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={
        isLive ? t("attendance.liveTimer") : t("attendance.sessionComplete")
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-primary">
            <Timer className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold">
              {isLive
                ? t("attendance.liveSessionCard")
                : t("attendance.sessionComplete")}
            </p>
            <p className="text-xs text-muted-foreground">
              {isLive
                ? t("attendance.liveTimerHint")
                : t("attendance.sessionCompleteHint")}
            </p>
          </div>
        </div>
        {status ? <StatusBadge status={status} /> : null}
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-3xl font-semibold tracking-tight tabular-nums">
            {isLive ? formatLiveDuration(seconds) : settledLabel}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {isComplete
              ? t("attendance.netHours")
              : t("attendance.ofShift", {
                  hours: Math.round(targetSeconds / 3600),
                })}
          </p>
        </div>
        <AnimatePresence>
          {breakMinutes > 0 ? (
            <motion.p
              initial={reduceMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: easeOutExpo }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-2.5 py-1 text-xs text-muted-foreground"
            >
              <Coffee className="h-3.5 w-3.5" aria-hidden />
              {t("attendance.breakDeducted")}
              <span className="font-semibold tabular-nums text-foreground">
                {formatHmDuration(breakMinutes, t)}
              </span>
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={false}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.4, ease: easeOutExpo }}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="font-mono tabular-nums">
          {format(parseISO(checkIn), "h:mm a", { locale: dateLocale })}
          {checkOut
            ? ` → ${format(parseISO(checkOut), "h:mm a", { locale: dateLocale })}`
            : expectedOutIso
              ? ` → ${format(parseISO(expectedOutIso), "h:mm a", { locale: dateLocale })}`
              : ""}
        </span>
      </div>
    </motion.div>
  );
}
