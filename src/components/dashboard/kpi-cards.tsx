"use client";

import {
  UserCheck,
  UserX,
  Clock,
  Home,
  TrendingUp,
  CalendarOff,
} from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
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
      href: "/attendance",
      hint: t("dashboard.kpiHintPresent"),
    },
    {
      key: "late",
      label: t("dashboard.late"),
      value: stats.late,
      icon: Clock,
      tone: "text-amber-700 dark:text-amber-400",
      href: "/attendance",
      hint: t("dashboard.kpiHintLate"),
    },
    {
      key: "wfh",
      label: t("dashboard.wfh"),
      value: stats.wfh,
      icon: Home,
      tone: "text-sky-700 dark:text-sky-400",
      href: "/attendance",
      hint: t("dashboard.kpiHintWfh"),
    },
    {
      key: "absent",
      label: t("dashboard.absent"),
      value: stats.absent,
      icon: UserX,
      tone: "text-rose-700 dark:text-rose-400",
      href: "/attendance",
      hint: t("dashboard.kpiHintAbsent"),
    },
    {
      key: "onLeave",
      label: t("status.on_leave"),
      value: stats.onLeave,
      icon: CalendarOff,
      tone: "text-violet-700 dark:text-violet-400",
      href: "/leave",
      hint: t("dashboard.kpiHintLeave"),
    },
    {
      key: "rate",
      label: t("dashboard.attendanceRate"),
      value: stats.attendanceRate,
      icon: TrendingUp,
      tone: "text-teal-800 dark:text-teal-300",
      suffix: "%",
      decimals: 1,
      href: "/reports",
      hint: t("dashboard.kpiHintRate"),
    },
  ] as const;

  return (
    <StaggerRoot
      speed="fast"
      className="grid min-w-0 grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-6"
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
            badge={"badge" in item ? item.badge : undefined}
            href={item.href}
            hint={item.hint}
          />
        </StaggerItem>
      ))}
    </StaggerRoot>
  );
}
