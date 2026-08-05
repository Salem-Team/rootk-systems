"use client";

import { motion, useReducedMotion } from "framer-motion";
import { STATUS_COLORS, STATUS_COLORS_ON_DARK } from "@/constants";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/hooks/use-translation";

type StatusKey = keyof typeof STATUS_COLORS;

const DOT: Record<StatusKey, string> = {
  present: "bg-emerald-600 dark:bg-emerald-400",
  approved: "bg-emerald-600 dark:bg-emerald-400",
  active: "bg-primary",
  absent: "bg-rose-600 dark:bg-rose-400",
  rejected: "bg-rose-600 dark:bg-rose-400",
  late: "bg-amber-600 dark:bg-amber-400",
  pending: "bg-amber-600 dark:bg-amber-400",
  early_leave: "bg-orange-600 dark:bg-orange-400",
  wfh: "bg-sky-600 dark:bg-sky-400",
  half_day: "bg-teal-600 dark:bg-teal-400",
  on_leave: "bg-slate-600 dark:bg-slate-300",
  inactive: "bg-slate-500 dark:bg-slate-400",
};

const DOT_ON_DARK: Record<StatusKey, string> = {
  present: "bg-emerald-800",
  approved: "bg-emerald-800",
  active: "bg-primary",
  absent: "bg-rose-800",
  rejected: "bg-rose-800",
  late: "bg-amber-800",
  pending: "bg-amber-800",
  early_leave: "bg-orange-800",
  wfh: "bg-sky-800",
  half_day: "bg-teal-800",
  on_leave: "bg-slate-800",
  inactive: "bg-slate-700",
};

const PULSE: StatusKey[] = ["pending", "late", "early_leave"];

interface StatusBadgeProps {
  status: StatusKey;
  className?: string;
  /** Use on navy/hero/dark surfaces — solid light chip, dark ink */
  onDark?: boolean;
}

export function StatusBadge({
  status,
  className,
  onDark = false,
}: StatusBadgeProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const tone = onDark ? STATUS_COLORS_ON_DARK[status] : STATUS_COLORS[status];
  const dot = onDark ? DOT_ON_DARK[status] : DOT[status];
  const pulse = !reduceMotion && PULSE.includes(status);

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-0 border font-semibold shadow-none transition-transform duration-200",
        tone,
        className
      )}
    >
      <span className="relative me-1.5 inline-flex h-1.5 w-1.5 items-center justify-center">
        {pulse ? (
          <motion.span
            className={cn("absolute inset-0 rounded-full opacity-50", dot)}
            animate={{ scale: [1, 2.1, 1], opacity: [0.45, 0, 0.45] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden
          />
        ) : null}
        <span
          className={cn(
            "relative inline-block h-1.5 w-1.5 rounded-full ring-2",
            onDark ? "ring-white/70" : "ring-white/90 dark:ring-black/30",
            dot
          )}
          aria-hidden
        />
      </span>
      {t(`status.${status}`)}
    </Badge>
  );
}
