"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import { Badge } from "@/components/ui/badge";
import { iconPop, snappySpring } from "@/lib/animations";
import { cn } from "@/lib/utils";
import type { SparkPoint } from "@/components/dashboard/dashboard-mock-data";

interface KpiCardProps {
  label: string;
  value: number;
  suffix?: string;
  decimals?: number;
  icon: LucideIcon;
  tone?: string;
  trend?: number;
  spark?: SparkPoint[];
  badge?: string;
  className?: string;
}

function MiniSpark({ points }: { points: SparkPoint[] }) {
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
  trend,
  spark,
  badge,
  className,
}: KpiCardProps) {
  const reduceMotion = useReducedMotion();
  const up = (trend ?? 0) >= 0;

  return (
    <motion.article
      initial={reduceMotion ? false : "rest"}
      whileHover={reduceMotion ? undefined : "hover"}
      variants={
        reduceMotion
          ? undefined
          : {
              rest: { y: 0 },
              hover: { y: -2, transition: snappySpring },
            }
      }
      className={cn(
        "kpi-tile surface-panel-interactive surface-shine group relative overflow-hidden",
        className
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="section-label !mb-0">{label}</p>
            {badge ? (
              <Badge
                variant="info"
                className="h-5 px-1.5 text-[10px] font-semibold"
              >
                {badge}
              </Badge>
            ) : null}
          </div>
          <p className="stat-value mt-2 text-[1.5rem] md:text-[1.65rem]">
            <AnimatedCounter
              value={value}
              suffix={suffix}
              decimals={decimals}
            />
          </p>
          {typeof trend === "number" ? (
            <motion.p
              initial={reduceMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.15,
                duration: 0.35,
                ease: [0.16, 1, 0.3, 1],
              }}
              className={cn(
                "mt-2 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium",
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
            </motion.p>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-2.5">
          <motion.div
            variants={reduceMotion ? undefined : iconPop}
            className={cn("icon-well h-9 w-9", tone)}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
          </motion.div>
          {spark ? <MiniSpark points={spark} /> : null}
        </div>
      </div>
    </motion.article>
  );
}
