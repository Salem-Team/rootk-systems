"use client";

import {
  AlertOctagon,
  CalendarClock,
  CheckCircle2,
  Gauge,
  ListTodo,
  Target,
  TimerReset,
  TrendingUp,
  UserX,
} from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { StaggerItem, StaggerRoot } from "@/components/shared/stagger";
import { useTranslation } from "@/hooks/use-translation";
import type { TargetDashboardStats } from "@/types/targets";

/** KPI strip for the targets dashboard — total/completed/in-progress/... */
export function TargetKpiCards({ stats }: { stats: TargetDashboardStats }) {
  const { t } = useTranslation();

  const items = [
    {
      key: "total",
      label: t("targets.kpi.total"),
      value: stats.total,
      icon: Target,
      tone: "text-primary",
    },
    {
      key: "completed",
      label: t("targets.kpi.completed"),
      value: stats.completed,
      icon: CheckCircle2,
      tone: "text-emerald-700 dark:text-emerald-400",
    },
    {
      key: "inProgress",
      label: t("targets.kpi.inProgress"),
      value: stats.inProgress,
      icon: ListTodo,
      tone: "text-sky-700 dark:text-sky-400",
    },
    {
      key: "delayed",
      label: t("targets.kpi.delayed"),
      value: stats.delayed,
      icon: TimerReset,
      tone: "text-amber-700 dark:text-amber-400",
    },
    {
      key: "critical",
      label: t("targets.kpi.critical"),
      value: stats.critical,
      icon: AlertOctagon,
      tone: "text-rose-700 dark:text-rose-400",
    },
    {
      key: "completionRate",
      label: t("targets.kpi.completionRate"),
      value: stats.completionRate,
      icon: TrendingUp,
      tone: "text-teal-800 dark:text-teal-300",
      suffix: "%",
      decimals: 1,
    },
    {
      key: "averagePerformance",
      label: t("targets.kpi.avgPerformance"),
      value: stats.averagePerformance,
      icon: Gauge,
      tone: "text-primary",
      decimals: 1,
    },
    {
      key: "employeesAtRisk",
      label: t("targets.kpi.atRisk"),
      value: stats.employeesAtRisk,
      icon: UserX,
      tone: "text-rose-700 dark:text-rose-400",
    },
    {
      key: "upcomingDeadlines",
      label: t("targets.kpi.upcoming"),
      value: stats.upcomingDeadlines,
      icon: CalendarClock,
      tone: "text-violet-700 dark:text-violet-400",
    },
  ] as const;

  return (
    <StaggerRoot
      speed="fast"
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
      role="list"
      aria-label={t("targets.kpi.groupLabel")}
    >
      {items.map((item) => (
        <StaggerItem key={item.key} preset="rise" role="listitem">
          <KpiCard
            label={item.label}
            value={item.value}
            suffix={"suffix" in item ? item.suffix : undefined}
            decimals={"decimals" in item ? item.decimals : 0}
            icon={item.icon}
            tone={item.tone}
          />
        </StaggerItem>
      ))}
    </StaggerRoot>
  );
}
