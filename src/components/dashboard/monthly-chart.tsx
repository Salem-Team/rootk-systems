"use client";

import { useMemo } from "react";
import { useReducedMotion } from "framer-motion";
import {
  Bar,
  BarChart,
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
import type { MonthlyStat } from "@/types";

const MONTH_KEYS: Record<string, TranslationPath> = {
  Mar: "months.Mar",
  Apr: "months.Apr",
  May: "months.May",
  Jun: "months.Jun",
  Jul: "months.Jul",
  Aug: "months.Aug",
};

export function MonthlyChart({ data }: { data: MonthlyStat[] }) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

  const chartData = useMemo(
    () =>
      data.map((row) => ({
        ...row,
        month: MONTH_KEYS[row.month] ? t(MONTH_KEYS[row.month]) : row.month,
      })),
    [data, t]
  );

  return (
    <Reveal preset="scale" delay={0.06} inView={false}>
      <section className="surface-panel overflow-hidden">
        <div className="panel-header">
          <h3 className="text-[0.95rem] font-semibold tracking-tight">
            {t("dashboard.monthlyTrend")}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t("dashboard.monthlyTrendDesc")}
          </p>
        </div>
        <div
          className="panel-body h-[280px]"
          role="img"
          aria-label={t("dashboard.monthlyTrend")}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              />
              <YAxis
                domain={[80, 100]}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                unit="%"
              />
              <Tooltip
                formatter={(value) => [`${value}%`, t("charts.rate")]}
                contentStyle={chartTooltipStyle}
              />
              <Bar
                dataKey="attendanceRate"
                name={t("charts.rate")}
                fill={CHART.present}
                radius={[6, 6, 0, 0]}
                animationDuration={reduceMotion ? 0 : 1000}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </Reveal>
  );
}
