"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import { Badge } from "@/components/ui/badge";
import { iconPop } from "@/lib/animations";
import { cn } from "@/lib/utils";
import type { SparkPoint } from "@/components/dashboard/dashboard-mock-data";

interface KpiCardProps {
  label: string;
  value: number;
  suffix?: string;
  decimals?: number;
  icon: LucideIcon;
  tone?: string;
  badge?: string;
  href?: string;
  hint?: string;
  /** Optional legacy sparkline; omitted on the simplified dashboard. */
  spark?: SparkPoint[];
  /** Optional legacy trend delta; hidden when 0. */
  trend?: number;
  className?: string;
}

function MiniSpark({ points }: { points: SparkPoint[] }) {
  if (points.length < 2) return null;
  const max = Math.max(...points.map((p) => p.v), 1);
  const min = Math.min(...points.map((p) => p.v), 0);
  const w = 72;
  const h = 26;
  const coords = points
    .map((p, i) => {
      const x = (i / Math.max(points.length - 1, 1)) * w;
      const y = h - ((p.v - min) / Math.max(max - min, 1)) * (h - 2) - 1;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="overflow-visible text-primary/55"
      aria-hidden
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={coords}
      />
    </svg>
  );
}

export function KpiCard({
  label,
  value,
  suffix,
  decimals = 0,
  icon: Icon,
  tone = "text-primary",
  badge,
  href,
  hint,
  spark,
  trend,
  className,
}: KpiCardProps) {
  const reduceMotion = useReducedMotion();
  const showTrend = typeof trend === "number" && trend !== 0;
  const up = (trend ?? 0) >= 0;
  const sparkEl = spark && spark.length >= 2 ? <MiniSpark points={spark} /> : null;

  const content = (
    <>
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1">
            <p className="section-label !mb-0 line-clamp-2 leading-snug">{label}</p>
            {badge ? (
              <Badge
                variant="info"
                className="h-5 max-w-full px-1.5 text-[10px] font-semibold"
              >
                {badge}
              </Badge>
            ) : null}
          </div>
          <p className="stat-value mt-1.5 text-[1.28rem] leading-none sm:mt-2.5 sm:text-[1.55rem] md:text-[1.7rem]">
            <AnimatedCounter
              value={value}
              suffix={suffix}
              decimals={decimals}
            />
          </p>
          {hint ? (
            <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground sm:mt-1.5">
              {hint}
            </p>
          ) : null}
          {showTrend ? (
            <p
              className={cn(
                "mt-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium",
                up
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "bg-rose-500/10 text-rose-700 dark:text-rose-400"
              )}
            >
              {up ? (
                <TrendingUp className="h-3 w-3" aria-hidden />
              ) : (
                <TrendingDown className="h-3 w-3" aria-hidden />
              )}
              <span className="tabular-nums">
                {up ? "+" : ""}
                {trend}
              </span>
            </p>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-2.5">
          <motion.div
            initial={reduceMotion ? false : "rest"}
            whileHover={reduceMotion ? undefined : "hover"}
            variants={reduceMotion ? undefined : iconPop}
            className={cn("icon-well h-8 w-8 shrink-0 sm:h-9 sm:w-9", tone)}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
          </motion.div>
          {sparkEl}
        </div>
      </div>
    </>
  );

  const shellClass = cn(
    "kpi-tile group relative block h-full overflow-hidden",
    href && "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
    className
  );

  if (href) {
    return (
      <div className="h-full">
        <Link href={href} className={shellClass} aria-label={label}>
          {content}
        </Link>
      </div>
    );
  }

  return <article className={shellClass}>{content}</article>;
}
