"use client";

import { useReducedMotion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState } from "@/components/shared/empty-state";
import { Reveal } from "@/components/shared/reveal";
import { CHART } from "@/constants/chart-colors";
import { chartTooltipStyle } from "@/constants/chart-tooltip";
import { useTranslation } from "@/hooks/use-translation";
import type { CrmChartPoint, CrmSalesPerformanceRow } from "@/types/crm";

interface TrendRow {
  label: string;
  leads: number;
  won: number;
}

interface CrmDashboardChartsProps {
  leadsByStage: CrmChartPoint[];
  trendData: TrendRow[];
  feedbackReasons: CrmChartPoint[];
  salesPerformance: CrmSalesPerformanceRow[];
  onNavigateLeads: (filters?: { stageId?: string }) => void;
  onNavigatePerformance?: () => void;
}

const AXIS = { fontSize: 12, fill: "var(--muted-foreground)" } as const;
const GRID = "var(--border)";

function withShare<T extends { value: number }>(rows: T[]) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  return rows.map((row) => ({
    ...row,
    share: total > 0 ? Math.round((row.value / total) * 1000) / 10 : 0,
  }));
}

function plotHeight(rows: number) {
  return Math.min(420, Math.max(200, rows * 38 + 36));
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number | string;
    color?: string;
    dataKey?: string | number;
    payload?: { share?: number };
  }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const share = payload[0]?.payload?.share;
  return (
    <div style={chartTooltipStyle}>
      {label ? <p className="mb-1 font-semibold">{label}</p> : null}
      {payload.map((item) => (
        <p key={String(item.dataKey)} className="flex items-center justify-between gap-4">
          <span style={{ color: item.color }}>{item.name}</span>
          <bdi dir="ltr" className="font-semibold tabular-nums">
            {item.value}
          </bdi>
        </p>
      ))}
      {share !== undefined ? (
        <p className="mt-1 text-muted-foreground">
          <bdi dir="ltr" className="tabular-nums">
            {share}%
          </bdi>
        </p>
      ) : null}
    </div>
  );
}

function ChartPlot({
  height,
  children,
}: {
  height: number;
  children: React.ReactElement;
}) {
  return (
    <div dir="ltr" className="w-full min-w-0" style={{ height }}>
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={0}
        initialDimension={{ width: 520, height }}
      >
        {children}
      </ResponsiveContainer>
    </div>
  );
}

/** Pipeline, trend, feedback reasons, and sales charts for the CRM dashboard. */
export function CrmDashboardCharts({
  leadsByStage,
  trendData,
  feedbackReasons,
  salesPerformance,
  onNavigateLeads,
  onNavigatePerformance,
}: CrmDashboardChartsProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const motion = reduceMotion ? 0 : 700;

  const stages = withShare(
    [...leadsByStage].sort((a, b) => b.value - a.value)
  );
  const reasons = withShare(feedbackReasons);
  const sales = [...salesPerformance]
    .filter((row) => row.leads > 0 || row.won > 0)
    .sort((a, b) => b.leads - a.leads || b.won - a.won)
    .slice(0, 8);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Reveal preset="scale" inView={false}>
        <section className="surface-panel overflow-hidden">
          <div className="panel-header">
            <h3 className="text-[0.95rem] font-semibold tracking-tight">
              {t("crm.dashboard.leadsByStage")}
            </h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {t("crm.dashboard.leadsByStageDesc")}
            </p>
          </div>
          <div className="chart-frame panel-body">
            {stages.length === 0 ? (
              <EmptyState compact title={t("crm.empty.chart")} />
            ) : (
              <ChartPlot height={plotHeight(stages.length)}>
                <BarChart
                  data={stages}
                  layout="vertical"
                  margin={{ top: 4, right: 36, left: 4, bottom: 4 }}
                  barCategoryGap="22%"
                >
                  <CartesianGrid stroke={GRID} horizontal={false} />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tick={AXIS}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={108}
                    tickLine={false}
                    axisLine={false}
                    tick={AXIS}
                    interval={0}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.35 }} />
                  <Bar
                    dataKey="value"
                    name={t("crm.performance.colLeads")}
                    radius={[0, 6, 6, 0]}
                    maxBarSize={18}
                    animationDuration={motion}
                    cursor="pointer"
                    onClick={(bar) => {
                      const key = (bar as { payload?: { key?: string } }).payload?.key;
                      if (key) onNavigateLeads({ stageId: key });
                    }}
                  >
                    {stages.map((stage) => (
                      <Cell key={stage.key} fill={stage.color || CHART.rate} />
                    ))}
                    <LabelList
                      dataKey="value"
                      position="right"
                      fontSize={11}
                      fill="var(--foreground)"
                    />
                  </Bar>
                </BarChart>
              </ChartPlot>
            )}
          </div>
        </section>
      </Reveal>

      <Reveal preset="scale" delay={0.05} inView={false}>
        <section className="surface-panel overflow-hidden">
          <div className="panel-header">
            <h3 className="text-[0.95rem] font-semibold tracking-tight">
              {t("crm.dashboard.leadsTrend")}
            </h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {t("crm.dashboard.leadsTrendDesc")}
            </p>
          </div>
          <div className="chart-frame panel-body">
            {trendData.length === 0 ? (
              <EmptyState compact title={t("crm.empty.chart")} />
            ) : (
              <ChartPlot height={260}>
                <AreaChart
                  data={trendData}
                  margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="crmNewLeadsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART.present} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={CHART.present} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="crmWonFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART.wfh} stopOpacity={0.22} />
                      <stop offset="100%" stopColor={CHART.wfh} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={AXIS}
                    interval="preserveStartEnd"
                    minTickGap={24}
                  />
                  <YAxis
                    allowDecimals={false}
                    width={36}
                    tickLine={false}
                    axisLine={false}
                    tick={AXIS}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area
                    type="monotone"
                    dataKey="leads"
                    name={t("crm.kpi.new")}
                    stroke={CHART.present}
                    fill="url(#crmNewLeadsFill)"
                    strokeWidth={2}
                    animationDuration={motion}
                  />
                  <Area
                    type="monotone"
                    dataKey="won"
                    name={t("crm.kpi.converted")}
                    stroke={CHART.wfh}
                    fill="url(#crmWonFill)"
                    strokeWidth={2}
                    animationDuration={motion}
                  />
                </AreaChart>
              </ChartPlot>
            )}
          </div>
        </section>
      </Reveal>

      <Reveal preset="scale" delay={0.08} inView={false}>
        <section className="surface-panel overflow-hidden">
          <div className="panel-header">
            <h3 className="text-[0.95rem] font-semibold tracking-tight">
              {t("crm.dashboard.feedbackReasons")}
            </h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {t("crm.dashboard.feedbackReasonsDesc")}
            </p>
          </div>
          <div className="chart-frame panel-body">
            {reasons.length === 0 ? (
              <EmptyState compact title={t("crm.empty.chart")} />
            ) : (
              <ChartPlot height={plotHeight(reasons.length)}>
                <BarChart
                  data={reasons}
                  layout="vertical"
                  margin={{ top: 4, right: 36, left: 4, bottom: 4 }}
                  barCategoryGap="22%"
                >
                  <CartesianGrid stroke={GRID} horizontal={false} />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tick={AXIS}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={120}
                    tickLine={false}
                    axisLine={false}
                    tick={AXIS}
                    interval={0}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.35 }} />
                  <Bar
                    dataKey="value"
                    name={t("crm.dashboard.feedbackReasons")}
                    fill={CHART.accent}
                    radius={[0, 6, 6, 0]}
                    maxBarSize={18}
                    animationDuration={motion}
                  >
                    <LabelList
                      dataKey="value"
                      position="right"
                      fontSize={11}
                      fill="var(--foreground)"
                    />
                  </Bar>
                </BarChart>
              </ChartPlot>
            )}
          </div>
        </section>
      </Reveal>

      <Reveal preset="scale" delay={0.1} inView={false}>
        <section className="surface-panel overflow-hidden">
          <div className="panel-header">
            <h3 className="text-[0.95rem] font-semibold tracking-tight">
              {t("crm.dashboard.salesPerformance")}
            </h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {t("crm.dashboard.salesPerformanceDesc")}
            </p>
          </div>
          <div className="chart-frame panel-body">
            {sales.length === 0 ? (
              <EmptyState compact title={t("crm.empty.chart")} />
            ) : (
              <ChartPlot height={plotHeight(sales.length)}>
                <BarChart
                  data={sales}
                  layout="vertical"
                  margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
                  barCategoryGap="20%"
                  barGap={3}
                >
                  <CartesianGrid stroke={GRID} horizontal={false} />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tick={AXIS}
                  />
                  <YAxis
                    type="category"
                    dataKey="employeeName"
                    width={108}
                    tickLine={false}
                    axisLine={false}
                    tick={AXIS}
                    interval={0}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.35 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    dataKey="leads"
                    name={t("crm.performance.colLeads")}
                    fill={CHART.hours}
                    radius={[0, 6, 6, 0]}
                    maxBarSize={14}
                    animationDuration={motion}
                    cursor={onNavigatePerformance ? "pointer" : undefined}
                    onClick={() => onNavigatePerformance?.()}
                  />
                  <Bar
                    dataKey="won"
                    name={t("crm.performance.colWon")}
                    fill={CHART.wfh}
                    radius={[0, 6, 6, 0]}
                    maxBarSize={14}
                    animationDuration={motion}
                    cursor={onNavigatePerformance ? "pointer" : undefined}
                    onClick={() => onNavigatePerformance?.()}
                  />
                </BarChart>
              </ChartPlot>
            )}
          </div>
        </section>
      </Reveal>
    </div>
  );
}
