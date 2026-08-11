"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/hooks/use-translation";
import type { Employee } from "@/types";
import type { CrmDashboardFilters, CrmDateRangePreset, CrmLeadSource } from "@/types/crm";

const SOURCES: CrmLeadSource[] = [
  "facebook",
  "instagram",
  "tiktok",
  "website",
  "whatsapp",
  "referral",
  "organic",
  "advertisement",
  "other",
];

interface CrmDashboardFiltersBarProps {
  filters: CrmDashboardFilters;
  employees: Employee[];
  canAssign?: boolean;
  onFiltersChange: (filters: CrmDashboardFilters) => void;
}

/** Range / sales owner / source filter controls for the CRM dashboard. */
export function CrmDashboardFiltersBar({
  filters,
  employees,
  canAssign = false,
  onFiltersChange,
}: CrmDashboardFiltersBarProps) {
  const { t } = useTranslation();

  return (
    <div className="filter-toolbar">
      <Select
        value={filters.range ?? "this_month"}
        onValueChange={(v) =>
          onFiltersChange({
            ...filters,
            range: v as CrmDateRangePreset,
          })
        }
      >
        <SelectTrigger className="filter-control h-9 sm:w-[160px]" aria-label={t("crm.filters.range")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="this_week">{t("crm.filters.thisWeek")}</SelectItem>
          <SelectItem value="last_7_days">{t("crm.filters.last7Days")}</SelectItem>
          <SelectItem value="this_month">{t("crm.filters.thisMonth")}</SelectItem>
          <SelectItem value="all">{t("crm.filters.all")}</SelectItem>
        </SelectContent>
      </Select>

      {canAssign ? (
        <Select
          value={filters.ownerEmployeeId || "all"}
          onValueChange={(v) =>
            onFiltersChange({
              ...filters,
              ownerEmployeeId: v === "all" ? undefined : v,
            })
          }
        >
          <SelectTrigger className="filter-control h-9 sm:w-[170px]" aria-label={t("crm.filters.sales")}>
            <SelectValue placeholder={t("crm.filters.allSales")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("crm.filters.allSales")}</SelectItem>
            {(Array.isArray(employees) ? employees : []).map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      <Select
        value={filters.source || "all"}
        onValueChange={(v) =>
          onFiltersChange({
            ...filters,
            source: v === "all" ? "" : (v as CrmLeadSource),
          })
        }
      >
        <SelectTrigger className="filter-control h-9 sm:w-[150px]" aria-label={t("crm.filters.source")}>
          <SelectValue placeholder={t("crm.filters.allSources")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("crm.filters.allSources")}</SelectItem>
          {SOURCES.map((s) => (
            <SelectItem key={s} value={s}>
              {t(`crm.source.${s}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
