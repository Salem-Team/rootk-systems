"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART } from "@/constants/chart-colors";
import { chartTooltipStyle } from "@/constants/chart-tooltip";
import type {
  LeaveAnalyticsPoint,
  TrendPoint,
} from "@/components/reports/analytics-mock-data";
import {
  ChartHtmlLegend,
  ChartRtlPolarTick,
  ChartRtlTick,
} from "@/components/shared/chart-rtl";
import { ChartPanel } from "./analytics-chart-panel";

const tooltipStyle = chartTooltipStyle;

type TrendRow = TrendPoint & { label: string };
type LeaveRow = LeaveAnalyticsPoint & { label: string };
type PieRow = { name: string; value: number; fill: string };
type RadarRow = { subject: string; score: number };

const axisTick = { fontSize: 10 };
const mobileMargin = { top: 8, right: 6, left: 0, bottom: 4 };

function DayAxis() {
  return (
    <XAxis
      dataKey="label"
      tickLine={false}
      axisLine={false}
      interval={0}
      minTickGap={2}
      height={36}
      tick={<ChartRtlTick fontSize={10} />}
    />
  );
}

export function AttendanceTrendChart({
  trend,
  title,
}: {
  trend: TrendRow[];
  title: string;
}) {
  return (
    <ChartPanel title={title} height={260}>
      <AreaChart data={trend} margin={mobileMargin}>
        <defs>
          <linearGradient id="reportsAttFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART.present} stopOpacity={0.28} />
            <stop offset="95%" stopColor={CHART.present} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
        <DayAxis />
        <YAxis
          domain={[0, 100]}
          tickLine={false}
          axisLine={false}
          tick={axisTick}
          width={30}
        />
        <Tooltip contentStyle={tooltipStyle} />
        <Area
          type="monotone"
          dataKey="attendance"
          name={title}
          stroke={CHART.present}
          fill="url(#reportsAttFill)"
          strokeWidth={2.25}
          animationDuration={900}
        />
      </AreaChart>
    </ChartPanel>
  );
}

export function HoursTrendChart({
  trend,
  title,
  hoursLabel,
  overtimeLabel,
}: {
  trend: TrendRow[];
  title: string;
  hoursLabel: string;
  overtimeLabel: string;
}) {
  return (
    <ChartPanel title={title} height={300}>
      <LineChart data={trend} margin={{ ...mobileMargin, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
        <DayAxis />
        <YAxis tickLine={false} axisLine={false} tick={axisTick} width={30} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend
          verticalAlign="bottom"
          height={36}
          content={<ChartHtmlLegend />}
        />
        <Line
          type="monotone"
          dataKey="hours"
          name={hoursLabel}
          stroke={CHART.hours}
          strokeWidth={2.25}
          dot={{ r: 3 }}
          animationDuration={900}
        />
        <Line
          type="monotone"
          dataKey="overtime"
          name={overtimeLabel}
          stroke={CHART.accent}
          strokeWidth={2}
          dot={{ r: 3 }}
          animationDuration={1000}
        />
      </LineChart>
    </ChartPanel>
  );
}

export function LateTrendChart({
  trend,
  title,
  lateLabel,
}: {
  trend: TrendRow[];
  title: string;
  lateLabel: string;
}) {
  return (
    <ChartPanel title={title} height={260}>
      <BarChart data={trend} margin={mobileMargin}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
        <DayAxis />
        <YAxis
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          tick={axisTick}
          width={28}
        />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar
          dataKey="late"
          name={lateLabel}
          fill={CHART.late}
          radius={[6, 6, 0, 0]}
          animationDuration={900}
        />
      </BarChart>
    </ChartPanel>
  );
}

export function WfhCompareCharts({
  trend,
  pie,
  compareTitle,
  mixTitle,
  officeLabel,
  hybridLabel,
  remoteLabel,
}: {
  trend: TrendRow[];
  pie: PieRow[];
  compareTitle: string;
  mixTitle: string;
  officeLabel: string;
  hybridLabel: string;
  remoteLabel: string;
}) {
  const showHybrid = trend.some((row) => (row.hybrid ?? 0) > 0);
  const pieRows = pie.filter((p) => p.value > 0);

  return (
    <>
      <ChartPanel title={compareTitle} height={310}>
        <BarChart data={trend} margin={{ ...mobileMargin, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
          <DayAxis />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={axisTick}
            width={28}
          />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend
            verticalAlign="bottom"
            height={40}
            content={<ChartHtmlLegend />}
          />
          <Bar dataKey="office" stackId="a" name={officeLabel} fill={CHART.rate} />
          {showHybrid ? (
            <Bar dataKey="hybrid" stackId="a" name={hybridLabel} fill={CHART.wfh} />
          ) : null}
          <Bar
            dataKey="wfh"
            stackId="a"
            name={remoteLabel}
            fill={CHART.present}
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ChartPanel>
      <ChartPanel title={mixTitle} height={300}>
        <PieChart margin={{ top: 4, right: 4, left: 4, bottom: 8 }}>
          <Pie
            data={pieRows}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="46%"
            innerRadius={52}
            outerRadius={78}
            paddingAngle={3}
            animationDuration={900}
          >
            {pieRows.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend
            verticalAlign="bottom"
            height={40}
            content={<ChartHtmlLegend />}
          />
        </PieChart>
      </ChartPanel>
    </>
  );
}

export function LeaveUtilChart({
  leave,
  title,
  approvedLabel,
  pendingLabel,
  remainingLabel,
}: {
  leave: LeaveRow[];
  title: string;
  approvedLabel: string;
  pendingLabel: string;
  remainingLabel: string;
}) {
  return (
    <ChartPanel title={title} height={310}>
      <BarChart data={leave} margin={{ ...mobileMargin, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          interval={0}
          minTickGap={2}
          height={36}
          tick={<ChartRtlTick fontSize={10} />}
        />
        <YAxis
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          tick={axisTick}
          width={28}
        />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend
          verticalAlign="bottom"
          height={40}
          content={<ChartHtmlLegend />}
        />
        <Bar dataKey="approved" name={approvedLabel} fill={CHART.present} radius={[4, 4, 0, 0]} />
        <Bar dataKey="pending" name={pendingLabel} fill={CHART.late} radius={[4, 4, 0, 0]} />
        <Bar dataKey="remaining" name={remainingLabel} fill={CHART.wfh} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartPanel>
  );
}

export function CompanyRadarChart({
  radar,
  title,
  hint,
  scoreLabel,
}: {
  radar: RadarRow[];
  title: string;
  hint: string;
  scoreLabel: string;
}) {
  return (
    <ChartPanel title={title} hint={hint} height={320}>
      <RadarChart data={radar} cx="50%" cy="48%" outerRadius="62%">
        <PolarGrid className="stroke-border" />
        <PolarAngleAxis dataKey="subject" tick={<ChartRtlPolarTick fontSize={10} />} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
        <Radar
          name={scoreLabel}
          dataKey="score"
          stroke={CHART.rate}
          fill={CHART.rate}
          fillOpacity={0.2}
          animationDuration={1000}
        />
        <Legend
          verticalAlign="bottom"
          height={36}
          content={<ChartHtmlLegend />}
        />
      </RadarChart>
    </ChartPanel>
  );
}
