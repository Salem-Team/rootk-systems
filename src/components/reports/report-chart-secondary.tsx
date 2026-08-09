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
import { CHART } from "@/constants/chart-colors";
import type { TranslationPath } from "@/i18n";
import { ChartCard, tooltipStyle } from "./report-chart-card";

interface SecondaryChartProps {
  weeklyData: Record<string, unknown>[];
  monthlyData: Record<string, unknown>[];
  t: (path: TranslationPath, vars?: Record<string, string | number>) => string;
}

export function LateReportChart({ weeklyData, monthlyData, t }: SecondaryChartProps) {
  return (
    <ChartCard title={t("reports.lateTab")} description={t("reports.description")}>
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

export function AbsenceReportChart({ weeklyData, monthlyData, t }: SecondaryChartProps) {
  return (
    <ChartCard title={t("reports.absenceTab")} description={t("reports.description")}>
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

export function MonthlyReportChart({ monthlyData, t }: SecondaryChartProps) {
  return (
    <ChartCard title={t("reports.monthlyTab")} description={t("dashboard.monthlyDesc")}>
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

export function HoursReportChart({ monthlyData, t }: SecondaryChartProps) {
  return (
    <ChartCard title={t("reports.hoursTab")} description={t("reports.description")}>
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
