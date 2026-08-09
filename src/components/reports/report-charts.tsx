"use client";

import { useMemo } from "react";
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
import { CHART } from "@/constants/chart-colors";
import { useTranslation } from "@/hooks/use-translation";
import type { TranslationPath } from "@/i18n";
import type { MonthlyStat, WeeklyStat } from "@/types";
import { ChartCard, tooltipStyle } from "./report-chart-card";
import {
  AbsenceReportChart,
  HoursReportChart,
  LateReportChart,
  MonthlyReportChart,
} from "./report-chart-secondary";

type ChartVariant = "attendance" | "late" | "absence" | "monthly" | "hours";

interface ReportChartsProps {
  weekly: WeeklyStat[];
  monthly: MonthlyStat[];
  variant?: ChartVariant;
}

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
    return <LateReportChart weeklyData={weeklyData} monthlyData={monthlyData} t={t} />;
  }

  if (variant === "absence") {
    return <AbsenceReportChart weeklyData={weeklyData} monthlyData={monthlyData} t={t} />;
  }

  if (variant === "monthly") {
    return <MonthlyReportChart weeklyData={weeklyData} monthlyData={monthlyData} t={t} />;
  }

  if (variant === "hours") {
    return <HoursReportChart weeklyData={weeklyData} monthlyData={monthlyData} t={t} />;
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
