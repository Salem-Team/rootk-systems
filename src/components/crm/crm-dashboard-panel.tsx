"use client";

import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-state";
import { CrmDashboardAttention } from "@/components/crm/crm-dashboard-attention";
import { CrmDashboardCharts } from "@/components/crm/crm-dashboard-charts";
import { CrmDashboardFiltersBar } from "@/components/crm/crm-dashboard-filters";
import { CrmDashboardKpis } from "@/components/crm/crm-dashboard-kpis";
import { CrmDashboardStageCards } from "@/components/crm/crm-dashboard-stage-cards";
import { useTranslation } from "@/hooks/use-translation";
import { ensureCrmDashboard } from "@/lib/crm-dashboard-normalize";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types";
import type {
  CrmAttentionItem,
  CrmDashboard,
  CrmDashboardFilters,
  CrmLeadFilters,
} from "@/types/crm";

interface CrmDashboardPanelProps {
  dashboard: CrmDashboard | null;
  loading?: boolean;
  filters: CrmDashboardFilters;
  onFiltersChange: (filters: CrmDashboardFilters) => void;
  onNavigateLeads: (filters?: Partial<CrmLeadFilters>) => void;
  onNavigatePerformance?: () => void;
  employees: Employee[];
  canAssign?: boolean;
  className?: string;
}

/** CRM dashboard: KPIs, stage cards, charts, attention, insights. */
export function CrmDashboardPanel({
  dashboard,
  loading = false,
  filters,
  onFiltersChange,
  onNavigateLeads,
  onNavigatePerformance,
  employees,
  canAssign = false,
  className,
}: CrmDashboardPanelProps) {
  const { t, locale } = useTranslation();
  const dateLocale = locale === "ar" ? arLocale : enUS;

  const safe = useMemo(
    () => (dashboard ? ensureCrmDashboard(dashboard) : null),
    [dashboard]
  );
  const leadsByStage = safe?.leadsByStage ?? [];
  const feedbackReasons = safe?.feedbackReasons ?? [];
  const salesPerformance = safe?.salesPerformance ?? [];
  const stageCards = safe?.stageCards ?? [];
  const needsAttention = safe?.needsAttention ?? [];
  const insights = safe?.insights ?? [];
  const kpis = safe?.kpis ?? {
    totalLeads: 0,
    newLeads: 0,
    activeLeads: 0,
    converted: 0,
    conversionRate: 0,
  };

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

  if (loading && !safe) {
    return <TableSkeleton rows={6} />;
  }

  if (!safe) {
    return (
      <EmptyState
        title={t("crm.errors.loadFailed")}
        description={t("crm.empty.chart")}
      />
    );
  }

  function onAttention(item: CrmAttentionItem) {
    if (item.ownerEmployeeId && onNavigatePerformance) {
      onNavigatePerformance();
      return;
    }
    onNavigateLeads(item.hrefFilter ?? {});
  }

  return (
    <div className={cn("space-y-4 sm:space-y-5", className)}>
      <CrmDashboardFiltersBar
        filters={filters}
        employees={employees}
        canAssign={canAssign}
        onFiltersChange={onFiltersChange}
      />

      <CrmDashboardKpis
        kpis={kpis}
        filters={filters}
        onNavigateLeads={onNavigateLeads}
      />

      <CrmDashboardStageCards
        stageCards={stageCards}
        onNavigateLeads={onNavigateLeads}
      />

      <CrmDashboardCharts
        leadsByStage={leadsByStage}
        trendData={trendData}
        feedbackReasons={feedbackReasons}
        salesPerformance={salesPerformance}
        onNavigateLeads={onNavigateLeads}
        onNavigatePerformance={onNavigatePerformance}
      />

      <CrmDashboardAttention
        needsAttention={needsAttention}
        insights={insights}
        onAttention={onAttention}
      />
    </div>
  );
}
