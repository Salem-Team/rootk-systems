"use client";

import { motion, useReducedMotion } from "framer-motion";
import { easeOutExpo } from "@/lib/animations";
import { cn } from "@/lib/utils";

export type ProgressRingTone = "primary" | "success" | "warning" | "danger" | "neutral";

const TONE_STROKE: Record<ProgressRingTone, string> = {
  primary: "var(--primary)",
  success: "#0f9d58",
  warning: "#d97706",
  danger: "#dc2626",
  neutral: "var(--muted-foreground)",
};

interface TargetProgressRingProps {
  /** 0–100. Values outside this range are clamped. */
  percentage: number;
  size?: number;
  strokeWidth?: number;
  tone?: ProgressRingTone;
  showLabel?: boolean;
  label?: string;
  className?: string;
}

/** Circular SVG progress indicator — used across target cards/lists/KPIs. */
export function TargetProgressRing({
  percentage,
  size = 56,
  strokeWidth = 5,
  tone = "primary",
  showLabel = true,
  label,
  className,
}: TargetProgressRingProps) {
  const reduceMotion = useReducedMotion();
  const clamped = Math.min(100, Math.max(0, percentage));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const stroke = TONE_STROKE[tone];

  return (
    <div
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? `${Math.round(clamped)}%`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
          opacity={0.45}
        />
        {reduceMotion ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        ) : (
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.8, ease: easeOutExpo }}
          />
        )}
      </svg>
      {showLabel ? (
        <span
          className="absolute inset-0 flex items-center justify-center font-display text-[0.7rem] font-bold tabular-nums"
          style={{ fontSize: Math.max(10, size * 0.24) }}
        >
          {Math.round(clamped)}
          <span className="text-[0.65em] opacity-60">%</span>
        </span>
      ) : null}
    </div>
  );
}
