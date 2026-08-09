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
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART } from "@/constants/chart-colors";
import { chartTooltipStyle } from "@/constants/chart-tooltip";
import type {
  buildLeaveAnalytics,
  buildModePie,
  buildWeeklyTrends,
} from "@/components/reports/analytics-mock-data";
import { ChartPanel } from "./analytics-chart-panel";

const tooltipStyle = chartTooltipStyle;

type TrendRow = ReturnType<typeof buildWeeklyTrends>[number];
type LeaveRow = ReturnType<typeof buildLeaveAnalytics>[number] & { label: string };
type PieRow = ReturnType<typeof buildModePie>[number] & { name: string };
type RadarRow = { subject: string; score: number };

export function AttendanceTrendChart({
  trend,
  title,
}: {
  trend: TrendRow[];
  title: string;
}) {
  return (
    <ChartPanel title={title}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={trend}>
          <defs>
            <linearGradient id="attFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART.present} stopOpacity={0.28} />
              <stop offset="95%" stopColor={CHART.present} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Area
            type="monotone"
            dataKey="attendance"
            name={title}
            stroke={CHART.present}
            fill="url(#attFill)"
            strokeWidth={2.25}
            animationDuration={900}
          />
        </AreaChart>
      </ResponsiveContainer>
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
    <ChartPanel title={title}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={trend}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend />
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
      </ResponsiveContainer>
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
    <ChartPanel title={title}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={trend}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar
            dataKey="late"
            name={lateLabel}
            fill={CHART.late}
            radius={[6, 6, 0, 0]}
            animationDuration={900}
          />
        </BarChart>
      </ResponsiveContainer>
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
  return (
    <>
      <ChartPanel title={compareTitle}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            <Bar dataKey="office" stackId="a" name={officeLabel} fill={CHART.rate} radius={[0, 0, 0, 0]} />
            <Bar dataKey="hybrid" stackId="a" name={hybridLabel} fill={CHART.wfh} />
            <Bar dataKey="wfh" stackId="a" name={remoteLabel} fill={CHART.present} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>
      <ChartPanel title={mixTitle}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pie}
              dataKey="value"
              nameKey="name"
              innerRadius={58}
              outerRadius={88}
              paddingAngle={3}
              animationDuration={900}
            >
              {pie.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
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
    <ChartPanel title={title}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={leave}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend />
          <Bar dataKey="approved" name={approvedLabel} fill={CHART.present} radius={[4, 4, 0, 0]} />
          <Bar dataKey="pending" name={pendingLabel} fill={CHART.late} radius={[4, 4, 0, 0]} />
          <Bar dataKey="remaining" name={remainingLabel} fill={CHART.wfh} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
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
    <ChartPanel title={title} hint={hint}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={radar}>
          <PolarGrid className="stroke-border" />
          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
          <Radar
            name={scoreLabel}
            dataKey="score"
            stroke={CHART.rate}
            fill={CHART.rate}
            fillOpacity={0.2}
            animationDuration={1000}
          />
          <Legend />
        </RadarChart>
      </ResponsiveContainer>
    </ChartPanel>
  );
}
