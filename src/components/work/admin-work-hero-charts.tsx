"use client";

import { useMemo } from "react";
import { useReducedMotion } from "framer-motion";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Bar,
  BarChart,
  XAxis,
  YAxis,
} from "recharts";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import type { AdminWorkHeroFilter } from "@/components/work/admin-work-panel-types";
import type { TaskPriority, TaskStatus } from "@/types/work";

export type AdminWorkHeroChartStats = {
  open: number;
  overdue: number;
  done: number;
  today: number;
  total: number;
  byStatus: { todo: number; in_progress: number; completed: number };
  byPriority: { high: number; medium: number; low: number };
};

const STATUS_COLORS = {
  todo: "#94a3b8",
  in_progress: "#38bdf8",
  completed: "#34d399",
} as const;

const PRIORITY_COLORS = {
  high: "#fb7185",
  medium: "#fbbf24",
  low: "#a78bfa",
} as const;

const darkTooltipStyle: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(8, 24, 56, 0.96)",
  color: "#f8fafc",
  fontSize: 12,
  boxShadow: "0 12px 32px -12px rgba(0,0,0,0.55)",
  padding: "8px 10px",
};

/** Compact Recharts for the admin work hero — status donut + priority bars. */
export function AdminWorkHeroCharts({
  stats,
  activeFilter = null,
  onStatusFilter,
  onPriorityFilter,
}: {
  stats: AdminWorkHeroChartStats;
  activeFilter?: AdminWorkHeroFilter;
  onStatusFilter?: (status: TaskStatus) => void;
  onPriorityFilter?: (priority: TaskPriority) => void;
}) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

  const statusData = useMemo(
    () =>
      (
        [
          {
            key: "todo" as const,
            name: t("ops.statusTodo"),
            value: stats.byStatus.todo,
            fill: STATUS_COLORS.todo,
          },
          {
            key: "in_progress" as const,
            name: t("ops.statusInProgress"),
            value: stats.byStatus.in_progress,
            fill: STATUS_COLORS.in_progress,
          },
          {
            key: "completed" as const,
            name: t("ops.statusCompleted"),
            value: stats.byStatus.completed,
            fill: STATUS_COLORS.completed,
          },
        ] as const
      ).filter((row) => row.value > 0),
    [stats.byStatus, t]
  );

  const priorityData = useMemo(
    () =>
      [
        {
          key: "high" as const,
          name: t("ops.priority.high"),
          value: stats.byPriority.high,
          fill: PRIORITY_COLORS.high,
        },
        {
          key: "medium" as const,
          name: t("ops.priority.medium"),
          value: stats.byPriority.medium,
          fill: PRIORITY_COLORS.medium,
        },
        {
          key: "low" as const,
          name: t("ops.priority.low"),
          value: stats.byPriority.low,
          fill: PRIORITY_COLORS.low,
        },
      ].filter((row) => row.value > 0),
    [stats.byPriority, t]
  );

  const statusTotal =
    stats.byStatus.todo +
    stats.byStatus.in_progress +
    stats.byStatus.completed;
  const openPriorityTotal =
    stats.byPriority.high + stats.byPriority.medium + stats.byPriority.low;

  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      <ChartCard
        title={t("workAdmin.chartStatus")}
        hint={t("workAdmin.chartStatusHint")}
      >
        {statusTotal === 0 ? (
          <EmptyChart label={t("workAdmin.chartEmpty")} />
        ) : (
          <div className="flex h-[132px] items-center gap-2">
            <div className="relative h-full min-w-0 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={36}
                    outerRadius={54}
                    paddingAngle={2}
                    stroke="rgba(6,28,74,0.65)"
                    strokeWidth={2}
                    isAnimationActive={!reduceMotion}
                    animationDuration={420}
                    animationBegin={0}
                    className="outline-none"
                    onClick={(entry) => {
                      const key = (entry as { key?: TaskStatus })?.key;
                      if (key && onStatusFilter) onStatusFilter(key);
                    }}
                    style={{ cursor: onStatusFilter ? "pointer" : undefined }}
                  >
                    {statusData.map((row) => (
                      <Cell
                        key={row.key}
                        fill={row.fill}
                        className={cn(
                          "outline-none transition-opacity",
                          activeFilter === row.key ||
                            (activeFilter === "open" && row.key !== "completed")
                            ? "opacity-100"
                            : activeFilter
                              ? "opacity-45"
                              : "opacity-100"
                        )}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={darkTooltipStyle}
                    itemStyle={{ color: "#e2e8f0" }}
                    formatter={(value, name) => [
                      Number(value ?? 0).toLocaleString(),
                      String(name ?? ""),
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-lg font-bold tabular-nums text-white">
                  {statusTotal}
                </span>
                <span className="text-[9px] font-medium uppercase tracking-wide text-white/50">
                  {t("workAdmin.chartTotal")}
                </span>
              </div>
            </div>
            <ul className="w-[7.5rem] shrink-0 space-y-1.5 pe-1">
              {statusData.map((row) => (
                <li key={row.key}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-1.5 rounded-md px-1 py-0.5 text-start touch-manipulation hover:bg-white/10"
                    onClick={() => onStatusFilter?.(row.key)}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: row.fill }}
                    />
                    <span className="min-w-0 flex-1 truncate text-[10px] text-white/70">
                      {row.name}
                    </span>
                    <span className="font-mono text-[10px] tabular-nums text-white/90">
                      {row.value}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </ChartCard>

      <ChartCard
        title={t("workAdmin.chartPriority")}
        hint={t("workAdmin.chartPriorityHint")}
      >
        {openPriorityTotal === 0 ? (
          <EmptyChart label={t("workAdmin.chartEmptyOpen")} />
        ) : (
          <div className="h-[132px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={priorityData}
                layout="vertical"
                margin={{ top: 4, right: 8, left: 4, bottom: 0 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={52}
                  tick={{ fill: "rgba(255,255,255,0.62)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.06)" }}
                  contentStyle={darkTooltipStyle}
                  itemStyle={{ color: "#e2e8f0" }}
                  formatter={(value) => [
                    Number(value ?? 0).toLocaleString(),
                    t("workAdmin.chartTasks"),
                  ]}
                />
                <Bar
                  dataKey="value"
                  radius={[0, 8, 8, 0]}
                  barSize={16}
                  isAnimationActive={!reduceMotion}
                  animationDuration={420}
                  onClick={(entry) => {
                    const key = (entry as { key?: TaskPriority })?.key;
                    if (key && onPriorityFilter) onPriorityFilter(key);
                  }}
                  style={{ cursor: onPriorityFilter ? "pointer" : undefined }}
                >
                  {priorityData.map((row) => (
                    <Cell key={row.key} fill={row.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>
    </div>
  );
}

function ChartCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/12 bg-white/[0.06] p-3 backdrop-blur-sm sm:rounded-xl sm:p-3.5">
      <div className="mb-2">
        <p className="text-[12px] font-semibold text-white">{title}</p>
        <p className="text-[10px] leading-snug text-white/50">{hint}</p>
      </div>
      {children}
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-[132px] items-center justify-center rounded-xl border border-dashed border-white/15 text-[12px] text-white/45">
      {label}
    </div>
  );
}
