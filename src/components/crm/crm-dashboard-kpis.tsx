"use client";

import {
  CheckCircle2,
  Layers3,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { StaggerItem, StaggerRoot } from "@/components/shared/stagger";
import { useTranslation } from "@/hooks/use-translation";
import type { CrmDashboardFilters, CrmKpis, CrmLeadFilters } from "@/types/crm";

interface CrmDashboardKpisProps {
  kpis: CrmKpis;
  filters: CrmDashboardFilters;
  onNavigateLeads: (filters?: Partial<CrmLeadFilters>) => void;
}

/** KPI cards row: total, new, active, converted, conversion rate. */
export function CrmDashboardKpis({
  kpis,
  filters,
  onNavigateLeads,
}: CrmDashboardKpisProps) {
  const { t } = useTranslation();

  const kpiItems = [
    {
      key: "total",
      label: t("crm.kpi.total"),
      value: kpis.totalLeads,
      icon: Layers3,
      tone: "text-primary",
      filter: {} as Partial<CrmLeadFilters>,
    },
    {
      key: "new",
      label: t("crm.kpi.new"),
      value: kpis.newLeads,
      icon: UserPlus,
      tone: "text-sky-700 dark:text-sky-400",
      filter: { range: filters.range ?? "this_week" } as Partial<CrmLeadFilters>,
    },
    {
      key: "active",
      label: t("crm.kpi.active"),
      value: kpis.activeLeads,
      icon: Users,
      tone: "text-teal-800 dark:text-teal-300",
      filter: { status: "active" as const },
    },
    {
      key: "converted",
      label: t("crm.kpi.converted"),
      value: kpis.converted,
      icon: CheckCircle2,
      tone: "text-emerald-700 dark:text-emerald-400",
      filter: {} as Partial<CrmLeadFilters>,
    },
    {
      key: "rate",
      label: t("crm.kpi.conversionRate"),
      value: kpis.conversionRate,
      icon: TrendingUp,
      tone: "text-primary",
      suffix: "%",
      decimals: 1,
      filter: {} as Partial<CrmLeadFilters>,
    },
  ] as const;

  return (
    <StaggerRoot
      speed="fast"
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
      role="list"
      aria-label={t("crm.kpi.groupLabel")}
    >
      {kpiItems.map((item) => (
        <StaggerItem key={item.key} preset="rise" role="listitem">
          <button
            type="button"
            className="w-full text-start"
            onClick={() => onNavigateLeads(item.filter)}
          >
            <KpiCard
              label={item.label}
              value={item.value}
              icon={item.icon}
              tone={item.tone}
              suffix={"suffix" in item ? item.suffix : undefined}
              decimals={"decimals" in item ? item.decimals : 0}
            />
          </button>
        </StaggerItem>
      ))}
    </StaggerRoot>
  );
}
