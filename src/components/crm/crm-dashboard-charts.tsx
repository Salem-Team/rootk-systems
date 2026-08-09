"use client";

import { useReducedMotion } from "framer-motion";
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
import { EmptyState } from "@/components/shared/empty-state";
import { Reveal } from "@/components/shared/reveal";
import { CHART } from "@/constants/chart-colors";
import { chartTooltipStyle } from "@/constants/chart-tooltip";
import { useTranslation } from "@/hooks/use-translation";
import type { CrmChartPoint, CrmSalesPerformanceRow, CrmTrendPoint } from "@/types/crm";

interface CrmDashboardChartsProps {
  leadsByStage: CrmChartPoint[];
  trendData: (CrmTrendPoint & { label: string })[];
  feedbackReasons: CrmChartPoint[];
  salesPerformance: CrmSalesPerformanceRow[];
  onNavigateLeads: (filters?: { stageId?: string }) => void;
  onNavigatePerformance?: () => void;
}

/** Leads-by-stage, leads trend, feedback reasons, and sales performance charts. */
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
          <div className="panel-body h-[260px]">
            {leadsByStage.length === 0 ? (
              <EmptyState compact title={t("crm.empty.chart")} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={leadsByStage}
                  margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Bar
                    dataKey="value"
                    fill={CHART.rate}
                    radius={[6, 6, 0, 0]}
                    animationDuration={reduceMotion ? 0 : 900}
                    cursor="pointer"
                    onClick={(data) => {
                      const key = (data as { key?: string })?.key;
                      if (key) onNavigateLeads({ stageId: key });
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
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
          <div className="panel-body h-[260px]">
            {trendData.length === 0 ? (
              <EmptyState compact title={t("crm.empty.chart")} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={trendData}
                  margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={CHART.present}
                    fill={CHART.present}
                    fillOpacity={0.15}
                    strokeWidth={2}
                    animationDuration={reduceMotion ? 0 : 900}
                  />
                </AreaChart>
              </ResponsiveContainer>
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
          <div className="panel-body h-[260px]">
            {feedbackReasons.length === 0 ? (
              <EmptyState compact title={t("crm.empty.chart")} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={feedbackReasons.slice(0, 8)}
                  layout="vertical"
                  margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={100}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Bar
                    dataKey="value"
                    fill={CHART.accent}
                    radius={[0, 6, 6, 0]}
                    animationDuration={reduceMotion ? 0 : 900}
                  />
                </BarChart>
              </ResponsiveContainer>
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
          <div className="panel-body h-[260px]">
            {salesPerformance.length === 0 ? (
              <EmptyState compact title={t("crm.empty.chart")} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={salesPerformance.slice(0, 8).map((r) => ({
                    name: r.employeeName,
                    value: r.leads,
                    employeeId: r.employeeId,
                  }))}
                  margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Bar
                    dataKey="value"
                    fill={CHART.hours}
                    radius={[6, 6, 0, 0]}
                    animationDuration={reduceMotion ? 0 : 900}
                    cursor={onNavigatePerformance ? "pointer" : undefined}
                    onClick={() => onNavigatePerformance?.()}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </Reveal>
    </div>
  );
}
