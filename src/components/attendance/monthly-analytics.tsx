"use client";

import { useMemo, useState } from "react";
import { addMonths, format, subMonths } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import { ChartHtmlLegend, ChartRtlTick } from "@/components/shared/chart-rtl";
import { buildMonthlyAnalytics } from "@/lib/attendance/build-monthly-analytics";
import { CHART } from "@/constants/chart-colors";
import { chartTooltipStyle } from "@/constants/chart-tooltip";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp } from "@/lib/animations";
import { demoNow } from "@/lib/mock-date";
import { cn } from "@/lib/utils";
import type { AttendanceRecord } from "@/types";

interface MonthlyAnalyticsProps {
  records: AttendanceRecord[];
  /** Controlled month (shared with calendar). */
  month?: Date;
  onMonthChange?: (month: Date) => void;
}

function ChartFrame({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="chart-frame h-[240px] sm:h-[280px] md:h-[300px]"
      role="img"
      aria-label={label}
    >
      {children}
    </div>
  );
}

export function MonthlyAnalytics({
  records,
  month: controlledMonth,
  onMonthChange,
}: MonthlyAnalyticsProps) {
  const { t, locale } = useTranslation();
  const reduceMotion = useReducedMotion();
  const dateLocale = locale === "ar" ? arLocale : enUS;
  const [internalMonth, setInternalMonth] = useState(() => demoNow());
  const month = controlledMonth ?? internalMonth;

  const setMonth = (next: Date) => {
    if (onMonthChange) onMonthChange(next);
    else setInternalMonth(next);
  };

  const analytics = useMemo(
    () =>
      buildMonthlyAnalytics(records, month, (index) =>
        t("attendance.weekN", { n: index + 1 })
      ),
    [records, month, t]
  );

  const chartData = useMemo(
    () =>
      analytics.weeks.map((week) => ({
        ...week,
        shortLabel: week.rangeLabel || week.label,
      })),
    [analytics.weeks]
  );

  const hasData = analytics.totals.recordCount > 0;
  const monthLabel = format(month, "MMMM yyyy", { locale: dateLocale });

  const kpis = [
    {
      key: "rate",
      label: t("attendance.weekRate"),
      value: analytics.totals.rate,
      suffix: "%",
      decimals: 1,
    },
    {
      key: "hours",
      label: t("attendance.weekHours"),
      value: analytics.totals.hours,
      suffix: t("common.hoursShort"),
      decimals: 1,
    },
    {
      key: "present",
      label: t("attendance.weekPresent"),
      value: analytics.totals.present,
      suffix: "",
      decimals: 0,
    },
    {
      key: "late",
      label: t("attendance.weekLate"),
      value: analytics.totals.late,
      suffix: "",
      decimals: 0,
    },
  ];

  const weekLabelFromPayload = (payload: unknown) => {
    const row = Array.isArray(payload)
      ? (payload[0] as { payload?: { label?: string; rangeLabel?: string } } | undefined)
          ?.payload
      : undefined;
    if (!row) return "";
    return row.rangeLabel
      ? `${row.label} · ${row.rangeLabel}`
      : String(row.label ?? "");
  };

  const asNumber = (value: unknown) =>
    typeof value === "number" ? value : Number(value ?? 0);

  return (
    <motion.div
      variants={fadeInUp}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
    >
      <section className="surface-panel overflow-hidden">
        <div className="panel-header flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[0.95rem] font-semibold tracking-tight">
              {t("attendance.monthlyAnalytics")}
            </h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {t("attendance.monthlyAnalyticsDesc")}
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-border/70 bg-muted/30 p-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setMonth(subMonths(month, 1))}
              aria-label={t("attendance.prevMonth")}
            >
              <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
            </Button>
            <span className="min-w-[7.5rem] px-1 text-center text-xs font-medium tabular-nums">
              {monthLabel}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setMonth(addMonths(month, 1))}
              aria-label={t("attendance.nextMonth")}
            >
              <ChevronRight className="h-4 w-4 rtl:rotate-180" />
            </Button>
          </div>
        </div>

        <div className="space-y-4 px-4 pb-4 sm:px-5 sm:pb-5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {kpis.map((item) => (
              <div
                key={item.key}
                className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5"
              >
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {item.label}
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight">
                  <AnimatedCounter
                    value={item.value}
                    decimals={item.decimals}
                    suffix={item.suffix}
                  />
                </p>
              </div>
            ))}
          </div>

          {!hasData ? (
            <div className="flex h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/10 px-6 text-center">
              <p className="text-sm font-medium">
                {t("attendance.analyticsEmptyTitle")}
              </p>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                {t("attendance.analyticsEmptyDesc")}
              </p>
            </div>
          ) : (
            <Tabs defaultValue="trend" className="w-full">
              <TabsList
                className={cn(
                  "mb-3 flex h-auto w-full flex-wrap justify-start gap-1",
                  "bg-muted/40 p-1"
                )}
              >
                <TabsTrigger value="trend" className="flex-1 sm:flex-none">
                  {t("attendance.chartTrend")}
                </TabsTrigger>
                <TabsTrigger value="hours" className="flex-1 sm:flex-none">
                  {t("attendance.chartHours")}
                </TabsTrigger>
                <TabsTrigger value="late" className="flex-1 sm:flex-none">
                  {t("attendance.chartLate")}
                </TabsTrigger>
                <TabsTrigger value="compare" className="flex-1 sm:flex-none">
                  {t("attendance.chartCompare")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="trend" className="mt-0">
                <ChartFrame label={t("attendance.chartTrend")}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData}
                      margin={{ top: 8, right: 6, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="attRateFill"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor={CHART.rate}
                            stopOpacity={0.28}
                          />
                          <stop
                            offset="95%"
                            stopColor={CHART.rate}
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-border"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="shortLabel"
                        tickLine={false}
                        axisLine={false}
                        tick={<ChartRtlTick fontSize={10} />}
                        interval={0}
                      />
                      <YAxis
                        domain={[0, 100]}
                        width={36}
                        tickLine={false}
                        axisLine={false}
                        tick={<ChartRtlTick fontSize={10} />}
                      />
                      <Tooltip
                        contentStyle={chartTooltipStyle}
                        formatter={(value) => [
                          `${asNumber(value)}%`,
                          t("attendance.weekRate"),
                        ]}
                        labelFormatter={(_, payload) =>
                          weekLabelFromPayload(payload)
                        }
                      />
                      <Area
                        type="monotone"
                        dataKey="rate"
                        name={t("attendance.weekRate")}
                        stroke={CHART.rate}
                        fill="url(#attRateFill)"
                        strokeWidth={2.25}
                        dot={{ r: 3, strokeWidth: 0, fill: CHART.rate }}
                        activeDot={{ r: 5 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartFrame>
              </TabsContent>

              <TabsContent value="hours" className="mt-0">
                <ChartFrame label={t("attendance.chartHours")}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 8, right: 6, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-border"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="shortLabel"
                        tickLine={false}
                        axisLine={false}
                        tick={<ChartRtlTick fontSize={10} />}
                        interval={0}
                      />
                      <YAxis
                        width={32}
                        tickLine={false}
                        axisLine={false}
                        tick={<ChartRtlTick fontSize={10} />}
                      />
                      <Tooltip
                        contentStyle={chartTooltipStyle}
                        formatter={(value) => [
                          `${asNumber(value)} ${t("common.hoursShort")}`,
                          t("attendance.chartHours"),
                        ]}
                        labelFormatter={(_, payload) =>
                          weekLabelFromPayload(payload)
                        }
                      />
                      <Bar
                        dataKey="hours"
                        name={t("attendance.chartHours")}
                        fill={CHART.hours}
                        radius={[8, 8, 0, 0]}
                        maxBarSize={42}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartFrame>
              </TabsContent>

              <TabsContent value="late" className="mt-0">
                <ChartFrame label={t("attendance.chartLate")}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={chartData}
                      margin={{ top: 8, right: 6, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-border"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="shortLabel"
                        tickLine={false}
                        axisLine={false}
                        tick={<ChartRtlTick fontSize={10} />}
                        interval={0}
                      />
                      <YAxis
                        yAxisId="days"
                        width={28}
                        tickLine={false}
                        axisLine={false}
                        tick={<ChartRtlTick fontSize={10} />}
                        allowDecimals={false}
                      />
                      <YAxis
                        yAxisId="mins"
                        orientation="right"
                        width={36}
                        tickLine={false}
                        axisLine={false}
                        tick={<ChartRtlTick fontSize={10} />}
                      />
                      <Tooltip
                        contentStyle={chartTooltipStyle}
                        formatter={(value, name) => {
                          const label = String(name ?? "");
                          if (label === t("attendance.lateMinutes")) {
                            return [
                              `${asNumber(value)} ${t("common.minutesShort")}`,
                              label,
                            ];
                          }
                          return [asNumber(value), label];
                        }}
                        labelFormatter={(_, payload) =>
                          weekLabelFromPayload(payload)
                        }
                      />
                      <Legend content={<ChartHtmlLegend />} />
                      <Bar
                        yAxisId="days"
                        dataKey="late"
                        name={t("charts.late")}
                        fill={CHART.late}
                        radius={[8, 8, 0, 0]}
                        maxBarSize={36}
                      />
                      <Line
                        yAxisId="mins"
                        type="monotone"
                        dataKey="lateMinutes"
                        name={t("attendance.lateMinutes")}
                        stroke={CHART.accent}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </ChartFrame>
              </TabsContent>

              <TabsContent value="compare" className="mt-0">
                <ChartFrame label={t("attendance.chartCompare")}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={chartData}
                      margin={{ top: 8, right: 6, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-border"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="shortLabel"
                        tickLine={false}
                        axisLine={false}
                        tick={<ChartRtlTick fontSize={10} />}
                        interval={0}
                      />
                      <YAxis
                        width={28}
                        tickLine={false}
                        axisLine={false}
                        tick={<ChartRtlTick fontSize={10} />}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={chartTooltipStyle}
                        labelFormatter={(_, payload) =>
                          weekLabelFromPayload(payload)
                        }
                      />
                      <Legend content={<ChartHtmlLegend />} />
                      <Bar
                        dataKey="present"
                        name={t("charts.present")}
                        fill={CHART.present}
                        radius={[6, 6, 0, 0]}
                        maxBarSize={28}
                      />
                      <Bar
                        dataKey="absent"
                        name={t("charts.absent")}
                        fill={CHART.absent}
                        radius={[6, 6, 0, 0]}
                        maxBarSize={28}
                      />
                      <Line
                        type="monotone"
                        dataKey="late"
                        name={t("charts.late")}
                        stroke={CHART.late}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </ChartFrame>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </section>
    </motion.div>
  );
}
