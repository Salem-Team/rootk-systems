"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { canFilterCrmByOwner } from "@/lib/crm/lead-filters";
import { useTranslation } from "@/hooks/use-translation";
import { formatClockHm } from "@/lib/format-time";
import { cn } from "@/lib/utils";
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

const HOURS = Array.from({ length: 24 }, (_, h) => h);

interface CrmDashboardFiltersBarProps {
  filters: CrmDashboardFilters;
  employees: Employee[];
  canAssign?: boolean;
  canViewOthers?: boolean;
  onFiltersChange: (filters: CrmDashboardFilters) => void;
  /** Show hour + custom date inputs (Performance / Reports). */
  showInteractionFilters?: boolean;
}

/** Range / sales owner / source filter controls for the CRM dashboard. */
export function CrmDashboardFiltersBar({
  filters,
  employees,
  canAssign = false,
  canViewOthers = false,
  onFiltersChange,
  showInteractionFilters = false,
}: CrmDashboardFiltersBarProps) {
  const { t, locale } = useTranslation();
  const [open, setOpen] = useState(false);
  const showOwnerFilter = canFilterCrmByOwner({ canAssign, canViewOthers });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 lg:hidden">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setOpen((v) => !v)}
        >
          <SlidersHorizontal className="me-1.5 h-3.5 w-3.5" />
          {t("crm.filters.title")}
        </Button>
      </div>

      <div
        className={cn(
          "filter-toolbar",
          open ? "flex" : "hidden! lg:flex!"
        )}
      >
        <Select
          value={filters.range ?? "this_month"}
          onValueChange={(v) =>
            onFiltersChange({
              ...filters,
              range: v as CrmDateRangePreset,
              dateFrom: undefined,
              dateTo: undefined,
            })
          }
        >
          <SelectTrigger
            className="filter-control h-9 sm:w-[160px]"
            aria-label={t("crm.filters.range")}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">{t("crm.filters.today")}</SelectItem>
            <SelectItem value="this_week">{t("crm.filters.thisWeek")}</SelectItem>
            <SelectItem value="last_7_days">{t("crm.filters.last7Days")}</SelectItem>
            <SelectItem value="this_month">{t("crm.filters.thisMonth")}</SelectItem>
            <SelectItem value="all">{t("crm.filters.all")}</SelectItem>
          </SelectContent>
        </Select>

        {showInteractionFilters ? (
          <>
            <Input
              type="date"
              className="filter-control h-9 sm:w-[150px]"
              value={filters.dateFrom ?? ""}
              aria-label={t("crm.filters.dateFrom")}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  dateFrom: e.target.value || undefined,
                })
              }
            />
            <Input
              type="date"
              className="filter-control h-9 sm:w-[150px]"
              value={filters.dateTo ?? ""}
              aria-label={t("crm.filters.dateTo")}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  dateTo: e.target.value || undefined,
                })
              }
            />
            <Select
              value={
                filters.hour === undefined || filters.hour === null
                  ? "all"
                  : String(filters.hour)
              }
              onValueChange={(v) =>
                onFiltersChange({
                  ...filters,
                  hour: v === "all" ? undefined : Number(v),
                })
              }
            >
              <SelectTrigger
                className="filter-control h-9 sm:w-[140px]"
                aria-label={t("crm.filters.hour")}
              >
                <SelectValue placeholder={t("crm.filters.allHours")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("crm.filters.allHours")}</SelectItem>
                {HOURS.map((h) => (
                  <SelectItem key={h} value={String(h)}>
                    {formatClockHm(`${String(h).padStart(2, "0")}:00`, locale)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        ) : null}

        {showOwnerFilter ? (
          <Select
            value={filters.ownerEmployeeId || "all"}
            onValueChange={(v) =>
              onFiltersChange({
                ...filters,
                ownerEmployeeId: v === "all" ? undefined : v,
              })
            }
          >
            <SelectTrigger
              className="filter-control h-9 sm:w-[170px]"
              aria-label={t("crm.filters.sales")}
            >
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
          <SelectTrigger
            className="filter-control h-9 sm:w-[150px]"
            aria-label={t("crm.filters.source")}
          >
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
    </div>
  );
}
