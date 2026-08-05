"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { motion, useReducedMotion } from "framer-motion";
import { CHART } from "@/constants/chart-colors";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp } from "@/lib/animations";
import type { TranslationPath } from "@/i18n";
import type { PersonalWeekPoint } from "@/components/dashboard/dashboard-mock-data";

const DAY_KEYS: Record<string, TranslationPath> = {
  Sun: "days.sun",
  Mon: "days.mon",
  Tue: "days.tue",
  Wed: "days.wed",
  Thu: "days.thu",
  Fri: "days.fri",
  Sat: "days.sat",
};

const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--card)",
  color: "var(--card-foreground)",
};

export function PersonalAttendanceChart({
  data,
}: {
  data: PersonalWeekPoint[];
}) {
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
    <motion.section
      variants={fadeInUp}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      className="surface-panel overflow-hidden"
      aria-labelledby="personal-att-chart"
    >
      <div className="panel-header">
        <h3
          id="personal-att-chart"
          className="text-[0.95rem] font-semibold tracking-tight"
        >
          {t("employeeHome.personalChart")}
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {t("employeeHome.personalChartDesc")}
        </p>
      </div>
      <div className="panel-body h-[240px]" role="img" aria-label={t("employeeHome.personalChart")}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="empHoursFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART.hours} stopOpacity={0.28} />
                <stop offset="95%" stopColor={CHART.hours} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
            <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area
              type="monotone"
              dataKey="hours"
              name={t("common.hours")}
              stroke={CHART.hours}
              fill="url(#empHoursFill)"
              strokeWidth={2.25}
              animationDuration={900}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.section>
  );
}

export function WeeklyHoursChart({ data }: { data: PersonalWeekPoint[] }) {
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
    <motion.section
      variants={fadeInUp}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      className="surface-panel overflow-hidden"
      aria-labelledby="weekly-hours-chart"
    >
      <div className="panel-header">
        <h3
          id="weekly-hours-chart"
          className="text-[0.95rem] font-semibold tracking-tight"
        >
          {t("employeeHome.weeklyHours")}
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {t("employeeHome.weeklyHoursDesc")}
        </p>
      </div>
      <div className="panel-body h-[240px]" role="img" aria-label={t("employeeHome.weeklyHours")}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
            <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar
              dataKey="hours"
              name={t("common.hours")}
              fill={CHART.present}
              radius={[6, 6, 0, 0]}
              animationDuration={900}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.section>
  );
}
