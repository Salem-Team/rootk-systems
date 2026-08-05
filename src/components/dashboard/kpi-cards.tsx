"use client";

import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Home,
  TrendingUp,
  CalendarOff,
} from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import {
  sparklineFor,
  trendDelta,
} from "@/components/dashboard/dashboard-mock-data";
import { StaggerItem, StaggerRoot } from "@/components/shared/stagger";
import { useTranslation } from "@/hooks/use-translation";
import type { DashboardStats } from "@/types";

export function KpiCards({ stats }: { stats: DashboardStats }) {
  const { t } = useTranslation();

  const items = [
    {
      key: "present",
      label: t("dashboard.present"),
      value: stats.present,
      icon: UserCheck,
      tone: "text-emerald-700 dark:text-emerald-400",
      badge: t("dashboard.liveNow"),
    },
    {
      key: "late",
      label: t("dashboard.late"),
      value: stats.late,
      icon: Clock,
      tone: "text-amber-700 dark:text-amber-400",
    },
    {
      key: "wfh",
      label: t("dashboard.wfh"),
      value: stats.wfh,
      icon: Home,
      tone: "text-sky-700 dark:text-sky-400",
    },
    {
      key: "absent",
      label: t("dashboard.absent"),
      value: stats.absent,
      icon: UserX,
      tone: "text-rose-700 dark:text-rose-400",
    },
    {
      key: "onLeave",
      label: t("status.on_leave"),
      value: stats.onLeave,
      icon: CalendarOff,
      tone: "text-violet-700 dark:text-violet-400",
    },
    {
      key: "rate",
      label: t("dashboard.attendanceRate"),
      value: stats.attendanceRate,
      icon: TrendingUp,
      tone: "text-teal-800 dark:text-teal-300",
      suffix: "%",
      decimals: 1,
    },
    {
      key: "total",
      label: t("dashboard.totalEmployees"),
      value: stats.totalEmployees,
      icon: Users,
      tone: "text-primary",
    },
  ] as const;

  return (
    <StaggerRoot
      speed="fast"
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7"
      role="list"
      aria-label={t("dashboard.executiveOverview")}
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
            trend={trendDelta(item.key)}
            spark={sparklineFor(item.key)}
            badge={"badge" in item ? item.badge : undefined}
          />
        </StaggerItem>
      ))}
    </StaggerRoot>
  );
}
