"use client";

import { useMemo } from "react";
import { useReducedMotion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
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
      <section className="surface-panel overflow-hidden">
        <div className="panel-header">
          <h3 className="text-[0.95rem] font-semibold tracking-tight">
            {t("dashboard.weeklyTitle")}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t("dashboard.weeklyDesc")}
          </p>
        </div>
        <div
          className="panel-body h-[320px]"
          role="img"
          aria-label={t("dashboard.weeklyTitle")}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
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
              <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: MUTED }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: MUTED }} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Legend />
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
      </section>
    </Reveal>
  );
}
