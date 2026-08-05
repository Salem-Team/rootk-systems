"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CHART } from "@/constants/chart-colors";
import { useTranslation } from "@/hooks/use-translation";
import type { TranslationPath } from "@/i18n";
import type { MonthlyStat, WeeklyStat } from "@/types";

type ChartVariant =
  | "attendance"
  | "late"
  | "absence"
  | "monthly"
  | "hours";

interface ReportChartsProps {
  weekly: WeeklyStat[];
  monthly: MonthlyStat[];
  variant?: ChartVariant;
}

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--card)",
};

const DAY_KEYS: Record<string, TranslationPath> = {
  Sun: "days.sun",
  Mon: "days.mon",
  Tue: "days.tue",
  Wed: "days.wed",
  Thu: "days.thu",
  Fri: "days.fri",
  Sat: "days.sat",
};

const MONTH_KEYS: Record<string, TranslationPath> = {
  Mar: "months.Mar",
  Apr: "months.Apr",
  May: "months.May",
  Jun: "months.Jun",
  Jul: "months.Jul",
  Aug: "months.Aug",
};

export function ReportCharts({
  weekly,
  monthly,
  variant = "attendance",
}: ReportChartsProps) {
  const { t } = useTranslation();

  const weeklyData = useMemo(
    () =>
      weekly.map((row) => ({
        ...row,
        day: DAY_KEYS[row.day] ? t(DAY_KEYS[row.day]) : row.day,
      })),
    [weekly, t]
  );

  const monthlyData = useMemo(
    () =>
      monthly.map((row) => ({
        ...row,
        month: MONTH_KEYS[row.month] ? t(MONTH_KEYS[row.month]) : row.month,
      })),
    [monthly, t]
  );

  if (variant === "late") {
    return (
      <ChartCard
        title={t("reports.lateTab")}
        description={t("reports.description")}
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="late" name={t("charts.late")} fill={CHART.late} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="lateCount"
                  name={t("charts.late")}
                  stroke={CHART.late}
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </ChartCard>
    );
  }

  if (variant === "absence") {
    return (
      <ChartCard
        title={t("reports.absenceTab")}
        description={t("reports.description")}
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="absent" name={t("charts.absent")} fill={CHART.absent} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="absentFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART.absent} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={CHART.absent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="absentCount"
                  name={t("charts.absent")}
                  stroke={CHART.absent}
                  fill="url(#absentFill)"
                  strokeWidth={2.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </ChartCard>
    );
  }

  if (variant === "monthly") {
    return (
      <ChartCard
        title={t("reports.monthlyTab")}
        description={t("dashboard.monthlyDesc")}
      >
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={monthlyData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[80, 100]}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
                unit="%"
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="lateCount"
                name={t("charts.late")}
                fill={CHART.late}
                radius={[6, 6, 0, 0]}
              />
              <Bar
                yAxisId="left"
                dataKey="absentCount"
                name={t("charts.absent")}
                fill={CHART.absent}
                radius={[6, 6, 0, 0]}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="attendanceRate"
                name={t("charts.rate")}
                stroke={CHART.rate}
                strokeWidth={2.5}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    );
  }

  if (variant === "hours") {
    return (
      <ChartCard
        title={t("reports.hoursTab")}
        description={t("reports.description")}
      >
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="hoursFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART.hours} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={CHART.hours} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
              <YAxis
                domain={[6, 9]}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
                unit="h"
              />
              <Tooltip
                formatter={(value) => [`${value}h`, t("reports.statsHours")]}
                contentStyle={tooltipStyle}
              />
              <Area
                type="monotone"
                dataKey="avgHours"
                name={t("reports.statsHours")}
                stroke={CHART.hours}
                fill="url(#hoursFill)"
                strokeWidth={2.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title={t("reports.attendanceTab")}
      description={t("dashboard.weeklyDesc")}
    >
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={weeklyData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="reportPresent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART.present} stopOpacity={0.35} />
                <stop offset="95%" stopColor={CHART.present} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="reportWfh" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART.wfh} stopOpacity={0.3} />
                <stop offset="95%" stopColor={CHART.wfh} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
            <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            <Area
              type="monotone"
              dataKey="present"
              name={t("charts.present")}
              stroke={CHART.present}
              fill="url(#reportPresent)"
              strokeWidth={2.5}
            />
            <Area
              type="monotone"
              dataKey="wfh"
              name={t("charts.wfh")}
              stroke={CHART.wfh}
              fill="url(#reportWfh)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="late"
              name={t("charts.late")}
              stroke={CHART.late}
              fill="transparent"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="absent"
              name={t("charts.absent")}
              stroke={CHART.absent}
              fill="transparent"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="transition-[box-shadow,border-color] duration-200 hover:border-primary/15 hover:shadow-[var(--shadow-card-hover)]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
