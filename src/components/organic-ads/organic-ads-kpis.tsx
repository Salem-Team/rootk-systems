"use client";

import {
  AlertTriangle,
  CheckCircle2,
  CalendarPlus,
  Layers3,
  Users,
} from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { StaggerItem, StaggerRoot } from "@/components/shared/stagger";
import { useTranslation } from "@/hooks/use-translation";
import type { OrganicAdsKpis } from "@/types/organic-ads";

export function OrganicAdsKpisStrip({ stats }: { stats: OrganicAdsKpis }) {
  const { t } = useTranslation();

  const items = [
    {
      key: "total",
      label: t("organicAds.kpi.totalAds"),
      value: stats.totalAds,
      icon: Layers3,
      tone: "text-primary",
    },
    {
      key: "active",
      label: t("organicAds.kpi.activeAds"),
      value: stats.activeAds,
      icon: CheckCircle2,
      tone: "text-emerald-700 dark:text-emerald-400",
    },
    {
      key: "period",
      label: t("organicAds.kpi.adsInPeriod"),
      value: stats.adsInPeriod,
      icon: CalendarPlus,
      tone: "text-sky-700 dark:text-sky-400",
    },
    {
      key: "sales",
      label: t("organicAds.kpi.salesParticipating"),
      value: stats.salesParticipating,
      icon: Users,
      tone: "text-teal-800 dark:text-teal-300",
    },
    {
      key: "attention",
      label: t("organicAds.kpi.needsAttention"),
      value: stats.needsAttention,
      icon: AlertTriangle,
      tone: "text-amber-700 dark:text-amber-400",
    },
  ] as const;

  return (
    <StaggerRoot
      speed="fast"
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
      role="list"
      aria-label={t("organicAds.kpi.groupLabel")}
    >
      {items.map((item) => (
        <StaggerItem key={item.key} preset="rise" role="listitem">
          <KpiCard
            label={item.label}
            value={item.value}
            icon={item.icon}
            tone={item.tone}
          />
        </StaggerItem>
      ))}
    </StaggerRoot>
  );
}
