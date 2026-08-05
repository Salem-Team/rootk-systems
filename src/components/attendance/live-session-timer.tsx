"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Timer } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import { easeOutExpo, softSpring } from "@/lib/animations";
import { cn, elapsedSeconds, formatHours, formatLiveDuration } from "@/lib/utils";

/** Default ROOTK shift length (09:00–18:00). */
export const SHIFT_MINUTES = 9 * 60;
const SHIFT_SECONDS = SHIFT_MINUTES * 60;

interface LiveSessionTimerProps {
  checkIn?: string;
  checkOut?: string;
  className?: string;
}

export function LiveSessionTimer({
  checkIn,
  checkOut,
  className,
}: LiveSessionTimerProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
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

  const progress = useMemo(
    () => Math.min(1, seconds / SHIFT_SECONDS),
    [seconds]
  );

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);
  const hoursLabel = formatHours(Math.floor(seconds / 60));

  if (!checkIn) return null;

  return (
    <motion.div
      layout
      initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={softSpring}
      className={cn(
        "relative overflow-hidden rounded-xl border border-primary/15 bg-primary/[0.03] p-5",
        className
      )}
    >
      <div className="relative flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative h-[128px] w-[128px] shrink-0">
            <svg
              viewBox="0 0 128 128"
              className="h-full w-full -rotate-90"
              aria-hidden
            >
              <circle
                cx="64"
                cy="64"
                r={radius}
                fill="none"
                className="stroke-muted"
                strokeWidth="8"
              />
              <motion.circle
                cx="64"
                cy="64"
                r={radius}
                fill="none"
                strokeWidth="8"
                strokeLinecap="round"
                className={cn(
                  isComplete ? "stroke-emerald-500" : "stroke-primary"
                )}
                strokeDasharray={circumference}
                initial={false}
                animate={{ strokeDashoffset: dashOffset }}
                transition={{ duration: 0.6, ease: easeOutExpo }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.p
                  key={formatLiveDuration(seconds)}
                  initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18 }}
                  className="font-mono text-xl font-semibold tracking-tight tabular-nums"
                >
                  {formatLiveDuration(seconds)}
                </motion.p>
              </AnimatePresence>
              {isLive ? (
                <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
                  {t("attendance.liveBadge")}
                </span>
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5 text-start">
            <div className="inline-flex items-center gap-2 text-sm font-semibold">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/12 text-primary">
                <Timer className="h-3.5 w-3.5" />
              </span>
              {isComplete
                ? t("attendance.sessionComplete")
                : t("attendance.liveTimer")}
            </div>
            <p className="max-w-[220px] text-xs text-muted-foreground">
              {isComplete
                ? t("attendance.sessionCompleteHint")
                : t("attendance.liveTimerHint")}
            </p>
            <p className="text-sm font-medium text-foreground">
              {hoursLabel}{" "}
              <span className="text-muted-foreground">
                · {t("attendance.ofShift", { hours: 9 })}
              </span>
            </p>
          </div>
        </div>

        <div className="w-full sm:max-w-[180px]">
          <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{Math.round(progress * 100)}%</span>
            <span>9h</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <motion.div
              className={cn(
                "h-full rounded-full",
                isComplete ? "bg-emerald-600" : "bg-primary"
              )}
              initial={false}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.5, ease: easeOutExpo }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
