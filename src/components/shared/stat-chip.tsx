"use client";

import type { LucideIcon } from "lucide-react";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import { cn } from "@/lib/utils";

interface StatChipProps {
  label: string;
  value: number | string;
  icon?: LucideIcon;
  suffix?: string;
  decimals?: number;
  tone?: string;
  compact?: boolean;
  className?: string;
}

/** Compact KPI / strip metric used in leave, payroll, and pulse widgets. */
export function StatChip({
  label,
  value,
  icon: Icon,
  suffix,
  decimals = 0,
  tone,
  compact = false,
  className,
}: StatChipProps) {
  return (
    <div
      className={cn(
        "kpi-tile",
        compact ? "px-3 py-2.5" : "px-3.5 py-3.5",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="section-label !mb-0">{label}</p>
        {Icon ? (
          <span className={cn("icon-well h-7 w-7", tone)}>
            <Icon className="h-3.5 w-3.5" aria-hidden />
          </span>
        ) : null}
      </div>
      <p
        className={cn(
          "stat-value mt-2",
          compact ? "text-[1.2rem]" : "text-[1.35rem] md:text-[1.45rem]"
        )}
      >
        {typeof value === "number" ? (
          <AnimatedCounter value={value} suffix={suffix} decimals={decimals} />
        ) : (
          value
        )}
      </p>
    </div>
  );
}
