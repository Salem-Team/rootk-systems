"use client";

import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
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
import { TableSkeleton } from "@/components/shared/loading-state";
import { CHART } from "@/constants/chart-colors";
import { chartTooltipStyle } from "@/constants/chart-tooltip";
import { useTranslation } from "@/hooks/use-translation";
import { ensureCrmDashboard } from "@/lib/crm-dashboard-normalize";
import { cn } from "@/lib/utils";
import type { CrmDashboard } from "@/types/crm";

interface CrmReportsPanelProps {
  dashboard: CrmDashboard | null;
  loading?: boolean;
  className?: string;
}

/** Lightweight admin reports reusing dashboard analytics. */
export function CrmReportsPanel({
  dashboard,
  loading = false,
  className,
}: CrmReportsPanelProps) {
  const { t, locale } = useTranslation();
  const reduceMotion = useReducedMotion();
  const dateLocale = locale === "ar" ? arLocale : enUS;

  const safe = useMemo(
    () => (dashboard ? ensureCrmDashboard(dashboard) : null),
    [dashboard]
  );

  const trendData = useMemo(
    () =>
      (safe?.leadsTrend ?? []).map((row) => ({
        ...row,
        label: (() => {
          try {
            return format(parseISO(row.date), "d MMM", { locale: dateLocale });
          } catch {
            return row.date;
          }
        })(),
      })),
    [safe?.leadsTrend, dateLocale]
  );

  if (loading && !safe) return <TableSkeleton rows={5} />;

  if (!safe) {
    return <EmptyState title={t("crm.errors.loadFailed")} />;
  }

  const kpis = safe.kpis;
  const leadsByStage = safe.leadsByStage;
  const salesPerformance = safe.salesPerformance;

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <h2 className="text-sm font-semibold tracking-tight">
          {t("crm.reports.title")}
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {t("crm.reports.description")}
        </p>
      </div>

      <section className="surface-panel">
        <div className="panel-header">
          <h3 className="text-[0.95rem] font-semibold tracking-tight">
            {t("crm.reports.conversionSummary")}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t("crm.reports.conversionSummaryDesc")}
          </p>
        </div>
        <div className="grid gap-2 p-4 sm:grid-cols-5">
          {[
            { label: t("crm.kpi.total"), value: kpis.totalLeads },
            { label: t("crm.kpi.new"), value: kpis.newLeads },
            { label: t("crm.kpi.active"), value: kpis.activeLeads },
            { label: t("crm.kpi.converted"), value: kpis.converted },
            {
              label: t("crm.kpi.conversionRate"),
              value: `${Number(kpis.conversionRate ?? 0).toFixed(1)}%`,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-lg border border-border/70 px-3 py-2.5"
            >
              <p className="text-[11px] text-muted-foreground">{item.label}</p>
              <p className="mt-1 font-mono text-lg font-semibold tabular-nums">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="surface-panel overflow-hidden">
          <div className="panel-header">
            <h3 className="text-[0.95rem] font-semibold tracking-tight">
              {t("crm.dashboard.leadsByStage")}
            </h3>
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
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="surface-panel overflow-hidden">
          <div className="panel-header">
            <h3 className="text-[0.95rem] font-semibold tracking-tight">
              {t("crm.dashboard.leadsTrend")}
            </h3>
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

        <section className="surface-panel overflow-hidden lg:col-span-2">
          <div className="panel-header">
            <h3 className="text-[0.95rem] font-semibold tracking-tight">
              {t("crm.performance.chartTitle")}
            </h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {t("crm.performance.chartDesc")}
            </p>
          </div>
          <div className="panel-body h-[260px]">
            {salesPerformance.length === 0 ? (
              <EmptyState compact title={t("crm.empty.chart")} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={salesPerformance.map((r) => ({
                    name: r.employeeName,
                    leads: r.leads,
                    won: r.won,
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
                    dataKey="leads"
                    name={t("crm.performance.colLeads")}
                    fill={CHART.hours}
                    radius={[6, 6, 0, 0]}
                    animationDuration={reduceMotion ? 0 : 900}
                  />
                  <Bar
                    dataKey="won"
                    name={t("crm.performance.colWon")}
                    fill={CHART.present}
                    radius={[6, 6, 0, 0]}
                    animationDuration={reduceMotion ? 0 : 900}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
