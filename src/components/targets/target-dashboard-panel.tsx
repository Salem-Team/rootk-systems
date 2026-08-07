"use client";

import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { useReducedMotion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Reveal } from "@/components/shared/reveal";
import { EmptyState } from "@/components/shared/empty-state";
import { CHART } from "@/constants/chart-colors";
import { chartTooltipStyle } from "@/constants/chart-tooltip";
import { departmentLabel } from "@/lib/department-label";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types";
import type { TargetDashboardStats } from "@/types/targets";

interface TargetDashboardPanelProps {
  stats: TargetDashboardStats;
  employees: Map<string, Employee>;
  onCategorySelect?: (categoryId: string) => void;
  className?: string;
}

function employeeName(employees: Map<string, Employee>, id: string): string {
  return employees.get(id)?.name ?? id;
}

/** Charts for the targets dashboard: trend, category mix, department, performers. */
export function TargetDashboardPanel({
  stats,
  employees,
  onCategorySelect,
  className,
}: TargetDashboardPanelProps) {
  const { t, locale } = useTranslation();
  const reduceMotion = useReducedMotion();
  const dateLocale = locale === "ar" ? arLocale : enUS;

  const trendData = useMemo(
    () =>
      stats.completionTrend.map((row) => ({
        ...row,
        label: format(parseISO(row.date), "d MMM", { locale: dateLocale }),
      })),
    [stats.completionTrend, dateLocale]
  );

  const categoryData = useMemo(
    () =>
      stats.byCategory.map((c) => ({
        id: c.id,
        name: c.name,
        value: c.count,
        fill: c.color,
      })),
    [stats.byCategory]
  );

  const departmentData = useMemo(
    () =>
      stats.byDepartment.slice(0, 8).map((d) => ({
        name: departmentLabel(d.department, t),
        avgScore: d.avgScore,
        count: d.count,
      })),
    [stats.byDepartment, t]
  );

  return (
    <div className={cn("grid gap-4 lg:grid-cols-3", className)}>
      <Reveal preset="scale" inView={false} className="lg:col-span-2">
        <section className="surface-panel overflow-hidden">
          <div className="panel-header">
            <h3 className="text-[0.95rem] font-semibold tracking-tight">
              {t("targets.dashboard.completionTrend")}
            </h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {t("targets.dashboard.completionTrendDesc")}
            </p>
          </div>
          <div className="panel-body h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={trendData}
                margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
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
                <Line
                  type="monotone"
                  dataKey="completed"
                  name={t("targets.kpi.completed")}
                  stroke={CHART.present}
                  strokeWidth={2.25}
                  dot={{ r: 3 }}
                  animationDuration={reduceMotion ? 0 : 900}
                />
                <Line
                  type="monotone"
                  dataKey="created"
                  name={t("targets.dashboard.created")}
                  stroke={CHART.rate}
                  strokeWidth={2.25}
                  strokeDasharray="4 4"
                  dot={{ r: 3 }}
                  animationDuration={reduceMotion ? 0 : 900}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </Reveal>

      <Reveal preset="scale" delay={0.05} inView={false}>
        <section className="surface-panel overflow-hidden">
          <div className="panel-header">
            <h3 className="text-[0.95rem] font-semibold tracking-tight">
              {t("targets.dashboard.byCategory")}
            </h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {t("targets.dashboard.byCategoryDesc")}
            </p>
          </div>
          <div className="panel-body h-[280px]">
            {categoryData.length === 0 ? (
              <EmptyState compact title={t("targets.dashboard.noData")} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={54}
                    outerRadius={84}
                    paddingAngle={3}
                    animationDuration={reduceMotion ? 0 : 900}
                    cursor={onCategorySelect ? "pointer" : undefined}
                    onClick={(_, index) => {
                      const row = categoryData[index];
                      if (row && onCategorySelect) onCategorySelect(row.id);
                    }}
                  >
                    {categoryData.map((entry) => (
                      <Cell key={entry.id} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </Reveal>

      <Reveal preset="scale" delay={0.08} className="lg:col-span-2" inView={false}>
        <section className="surface-panel overflow-hidden">
          <div className="panel-header">
            <h3 className="text-[0.95rem] font-semibold tracking-tight">
              {t("targets.dashboard.byDepartment")}
            </h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {t("targets.dashboard.byDepartmentDesc")}
            </p>
          </div>
          <div className="panel-body h-[260px]">
            {departmentData.length === 0 ? (
              <EmptyState compact title={t("targets.dashboard.noData")} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={departmentData}
                  margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Bar
                    dataKey="avgScore"
                    name={t("targets.list.performance")}
                    fill={CHART.rate}
                    radius={[6, 6, 0, 0]}
                    animationDuration={reduceMotion ? 0 : 900}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </Reveal>

      <Reveal preset="scale" delay={0.1} inView={false}>
        <div className="space-y-4">
          <PerformerList
            title={t("targets.dashboard.topPerformers")}
            icon={<ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" aria-hidden />}
            rows={stats.topPerformers}
            employees={employees}
            emptyLabel={t("targets.dashboard.noData")}
          />
          <PerformerList
            title={t("targets.dashboard.bottomPerformers")}
            icon={<ArrowDownRight className="h-3.5 w-3.5 text-rose-600" aria-hidden />}
            rows={stats.bottomPerformers}
            employees={employees}
            emptyLabel={t("targets.dashboard.noData")}
          />
        </div>
      </Reveal>
    </div>
  );
}

function PerformerList({
  title,
  icon,
  rows,
  employees,
  emptyLabel,
}: {
  title: string;
  icon: React.ReactNode;
  rows: TargetDashboardStats["topPerformers"];
  employees: Map<string, Employee>;
  emptyLabel: string;
}) {
  return (
    <section className="surface-panel overflow-hidden">
      <div className="panel-header">
        <h3 className="flex items-center gap-2 text-[0.9rem] font-semibold">
          {icon}
          {title}
        </h3>
      </div>
      <ul className="panel-body space-y-1.5">
        {rows.length === 0 ? (
          <p className="py-3 text-center text-[12px] text-muted-foreground">{emptyLabel}</p>
        ) : (
          rows.map((row) => (
            <li
              key={row.employeeId}
              className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-muted/40"
            >
              <span className="min-w-0 truncate font-medium">
                {employeeName(employees, row.employeeId)}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {row.completed}/{row.total} · {row.score}
              </span>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
