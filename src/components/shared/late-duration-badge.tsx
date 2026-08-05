"use client";

import { LogOut, Timer, Zap } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import { formatHmDuration, formatHmDurationFull } from "@/lib/duration-format";
import type { TranslationPath } from "@/i18n";
import { cn } from "@/lib/utils";

type DurationKind = "late" | "early" | "overtime";

interface AttendanceDurationBadgeProps {
  minutes: number;
  kind?: DurationKind;
  className?: string;
  size?: "sm" | "md";
  durationOnly?: boolean;
}

const KIND_STYLE: Record<
  DurationKind,
  {
    labelKey: TranslationPath;
    shell: string;
    icon: string;
  }
> = {
  late: {
    labelKey: "attendance.lateBy",
    shell:
      "border-amber-500/40 bg-gradient-to-b from-amber-50 to-amber-100/90 text-amber-950 dark:border-amber-500/45 dark:from-amber-950 dark:to-amber-950/70 dark:text-amber-50",
    icon: "text-amber-700 dark:text-amber-300",
  },
  early: {
    labelKey: "attendance.earlyLeave",
    shell:
      "border-orange-500/40 bg-gradient-to-b from-orange-50 to-orange-100/90 text-orange-950 dark:border-orange-500/45 dark:from-orange-950 dark:to-orange-950/70 dark:text-orange-50",
    icon: "text-orange-700 dark:text-orange-300",
  },
  overtime: {
    labelKey: "attendance.overtime",
    shell:
      "border-emerald-500/40 bg-gradient-to-b from-emerald-50 to-emerald-100/90 text-emerald-950 dark:border-emerald-500/45 dark:from-emerald-950 dark:to-emerald-950/70 dark:text-emerald-50",
    icon: "text-emerald-700 dark:text-emerald-300",
  },
};

/**
 * Shared duration chip for late / early leave / overtime (hours + minutes).
 */
export function AttendanceDurationBadge({
  minutes,
  kind = "late",
  className,
  size = "md",
  durationOnly = false,
}: AttendanceDurationBadgeProps) {
  const { t } = useTranslation();
  if (minutes <= 0) return null;

  const compact = formatHmDuration(minutes, t);
  const full = formatHmDurationFull(minutes, t);
  const style = KIND_STYLE[kind];
  const Icon = kind === "early" ? LogOut : kind === "overtime" ? Zap : Timer;

  return (
    <span
      title={`${t(style.labelKey)} — ${full}`}
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 border",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
        style.shell,
        size === "sm"
          ? "rounded-md px-2 py-0.5 text-[11px]"
          : "rounded-lg px-2.5 py-1 text-xs",
        className
      )}
    >
      <Icon
        className={cn(
          "shrink-0",
          style.icon,
          size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"
        )}
        aria-hidden
      />
      {!durationOnly ? (
        <span className="font-medium opacity-75">{t(style.labelKey)}</span>
      ) : null}
      <span className="font-semibold tabular-nums tracking-tight">{compact}</span>
      <span className="sr-only">{full}</span>
    </span>
  );
}

/** @deprecated Prefer AttendanceDurationBadge with kind="late" */
export function LateDurationBadge(
  props: Omit<AttendanceDurationBadgeProps, "kind">
) {
  return <AttendanceDurationBadge {...props} kind="late" />;
}
