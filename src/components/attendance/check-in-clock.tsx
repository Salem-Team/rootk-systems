"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { demoNow } from "@/lib/mock-date";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";

export function CheckInClock({
  progress,
  isLive,
}: {
  /** 0–100 ring fill */
  progress: number;
  isLive: boolean;
}) {
  const { t, locale } = useTranslation();
  const dateLocale = locale === "ar" ? arLocale : enUS;
  const reduceMotion = useReducedMotion();
  const [now, setNow] = useState(() => demoNow());

  useEffect(() => {
    const id = window.setInterval(() => setNow(demoNow()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const size = 168;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, progress));
  const dash = (clamped / 100) * circumference;

  return (
    <div className="relative mx-auto flex h-[168px] w-[168px] items-center justify-center sm:mx-0">
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-primary/[0.08]"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          className={cn(
            isLive
              ? "text-emerald-500 dark:text-emerald-400"
              : "text-primary"
          )}
          strokeDasharray={`${dash} ${circumference - dash}`}
          initial={false}
          animate={{ strokeDasharray: `${dash} ${circumference - dash}` }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
          }
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {t("attendance.currentTime")}
        </p>
        <AnimatePresence mode="wait">
          <motion.p
            key={format(now, "h:mm a")}
            initial={reduceMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="mt-1 font-mono text-[1.85rem] font-semibold leading-none tracking-tight tabular-nums"
          >
            {format(now, "h:mm a", { locale: dateLocale })}
          </motion.p>
        </AnimatePresence>
        <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              isLive
                ? "animate-pulse bg-emerald-500"
                : "bg-muted-foreground/40"
            )}
          />
          {isLive ? t("attendance.liveBadge") : t("attendance.readyToStart")}
        </p>
      </div>
    </div>
  );
}
