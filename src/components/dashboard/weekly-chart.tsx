"use client";

import { useMemo } from "react";
import { useReducedMotion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Reveal } from "@/components/shared/reveal";
import { CHART } from "@/constants/chart-colors";
import { chartTooltipStyle } from "@/constants/chart-tooltip";
import { useTranslation } from "@/hooks/use-translation";
import type { TranslationPath } from "@/i18n";
import type { WeeklyStat } from "@/types";

const MUTED = "var(--muted-foreground)";

const DAY_KEYS: Record<string, TranslationPath> = {
  Sun: "days.sun",
  Mon: "days.mon",
  Tue: "days.tue",
  Wed: "days.wed",
  Thu: "days.thu",
  Fri: "days.fri",
  Sat: "days.sat",
};

export function WeeklyChart({ data }: { data: WeeklyStat[] }) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

  const chartData = useMemo(
    () =>
      data.map((row) => ({
        ...row,
        day: DAY_KEYS[row.day] ? t(DAY_KEYS[row.day]) : row.day,
      })),
    [data, t]
  );

  return (
    <Reveal preset="scale" inView={false}>
      <section className="surface-panel h-full min-w-0 overflow-hidden">
        <div className="panel-header flex min-w-0 items-start justify-between gap-2 sm:gap-3">
          <div className="min-w-0">
            <h3 className="text-[0.95rem] font-semibold tracking-tight">
              {t("dashboard.weeklyTitle")}
            </h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {t("dashboard.weeklyDesc")}
            </p>
          </div>
          <span className="shrink-0 rounded-md border border-border/70 bg-muted/40 px-2 py-1 text-[10px] font-medium text-muted-foreground sm:text-[11px]">
            {t("dashboard.last7Days")}
          </span>
        </div>
        <div className="panel-body min-w-0">
          <div
            className="chart-frame h-[220px] sm:h-[300px] md:h-[320px]"
            role="img"
            aria-label={t("dashboard.weeklyTitle")}
          >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="presentFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART.present} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART.present} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="wfhFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART.wfh} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={CHART.wfh} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: MUTED }} interval={0} />
              <YAxis width={32} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: MUTED }} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Area
                type="monotone"
                dataKey="present"
                name={t("charts.present")}
                stroke={CHART.present}
                fill="url(#presentFill)"
                strokeWidth={2.25}
                animationDuration={reduceMotion ? 0 : 900}
              />
              <Area
                type="monotone"
                dataKey="wfh"
                name={t("charts.wfh")}
                stroke={CHART.wfh}
                fill="url(#wfhFill)"
                strokeWidth={2}
                animationDuration={reduceMotion ? 0 : 1100}
              />
              <Area
                type="monotone"
                dataKey="late"
                name={t("charts.late")}
                stroke={CHART.late}
                fill="transparent"
                strokeWidth={2}
                animationDuration={reduceMotion ? 0 : 1200}
              />
              <Area
                type="monotone"
                dataKey="absent"
                name={t("charts.absent")}
                stroke={CHART.absent}
                fill="transparent"
                strokeWidth={2}
                animationDuration={reduceMotion ? 0 : 1300}
              />
            </AreaChart>
          </ResponsiveContainer>
          </div>
          <ul className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5">
            {(
              [
                ["present", CHART.present, t("charts.present")],
                ["wfh", CHART.wfh, t("charts.wfh")],
                ["late", CHART.late, t("charts.late")],
                ["absent", CHART.absent, t("charts.absent")],
              ] as const
            ).map(([key, color, label]) => (
              <li
                key={key}
                className="inline-flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                  aria-hidden
                />
                <span className="truncate">{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </Reveal>
  );
}
