"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART } from "@/constants/chart-colors";
import type { TrendPoint } from "@/components/reports/analytics-mock-data";
import { ChartHtmlLegend, ChartRtlTick } from "@/components/shared/chart-rtl";
import { SafeResponsiveChart } from "@/components/shared/safe-responsive-chart";
import { useTranslation } from "@/hooks/use-translation";
import type { TranslationPath } from "@/i18n";
import { ChartCard, tooltipStyle } from "./report-chart-card";

const MONTH_KEYS: Record<string, TranslationPath> = {
  Jan: "months.Jan",
  Feb: "months.Feb",
  Mar: "months.Mar",
  Apr: "months.Apr",
  May: "months.May",
  Jun: "months.Jun",
  Jul: "months.Jul",
  Aug: "months.Aug",
  Sep: "months.Sep",
  Oct: "months.Oct",
  Nov: "months.Nov",
  Dec: "months.Dec",
};

/** Live monthly composed chart powered by attendance-derived trends. */
export function ReportCharts({
  monthlyTrends = [],
}: {
  monthlyTrends?: TrendPoint[];
}) {
  const { t } = useTranslation();

  const monthlyData = useMemo(
    () =>
      monthlyTrends.map((row) => ({
        month: MONTH_KEYS[row.label] ? t(MONTH_KEYS[row.label]) : row.label,
        attendanceRate: row.attendance,
        lateCount: row.late,
        avgHours: row.hours,
        wfh: row.wfh,
        office: row.office,
      })),
    [monthlyTrends, t]
  );

  if (monthlyData.length === 0) {
    return null;
  }

  return (
    <ChartCard
      title={t("reports.monthlyTab")}
      description={t("dashboard.monthlyDesc")}
    >
      <SafeResponsiveChart height={340}>
        <ComposedChart
          data={monthlyData}
          margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
        >
          <defs>
            <linearGradient id="reportsRateFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART.rate} stopOpacity={0.28} />
              <stop offset="95%" stopColor={CHART.rate} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-border"
            vertical={false}
          />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            interval={0}
            height={36}
            tick={<ChartRtlTick fontSize={10} />}
          />
          <YAxis
            yAxisId="left"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
            width={32}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 100]}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
            unit="%"
            width={40}
          />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend
            verticalAlign="bottom"
            height={40}
            content={<ChartHtmlLegend />}
          />
          <Bar
            yAxisId="left"
            dataKey="lateCount"
            name={t("charts.late")}
            fill={CHART.late}
            radius={[6, 6, 0, 0]}
          />
          <Bar
            yAxisId="left"
            dataKey="wfh"
            name={t("charts.wfh")}
            fill={CHART.wfh}
            radius={[6, 6, 0, 0]}
          />
          <Area
            yAxisId="right"
            type="monotone"
            dataKey="attendanceRate"
            name={t("charts.rate")}
            stroke={CHART.rate}
            fill="url(#reportsRateFill)"
            strokeWidth={2.5}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="avgHours"
            name={t("reports.statsHours")}
            stroke={CHART.hours}
            strokeWidth={2.25}
            dot={{ r: 3 }}
          />
        </ComposedChart>
      </SafeResponsiveChart>
    </ChartCard>
  );
}
