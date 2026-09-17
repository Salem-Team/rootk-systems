"use client";

import { useMemo, useState } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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

function DashboardFilterFields({
  filters,
  employees,
  showOwnerFilter,
  showInteractionFilters,
  stacked,
  onFiltersChange,
}: {
  filters: CrmDashboardFilters;
  employees: Employee[];
  showOwnerFilter: boolean;
  showInteractionFilters: boolean;
  stacked?: boolean;
  onFiltersChange: (filters: CrmDashboardFilters) => void;
}) {
  const { t, locale } = useTranslation();
  const triggerClass = stacked
    ? "filter-control h-11 w-full"
    : "filter-control h-11 touch-manipulation text-base sm:h-9 sm:w-[160px] sm:text-sm";

  return (
    <div className={cn(stacked ? "grid gap-2.5" : "filter-toolbar")}>
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
          className={triggerClass}
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
            className={cn(triggerClass, !stacked && "sm:w-[150px]")}
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
            className={cn(triggerClass, !stacked && "sm:w-[150px]")}
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
              className={cn(triggerClass, !stacked && "sm:w-[140px]")}
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
            className={cn(triggerClass, !stacked && "sm:w-[170px]")}
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
          className={cn(triggerClass, !stacked && "sm:w-[150px]")}
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
  );
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
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const showOwnerFilter = canFilterCrmByOwner({ canAssign, canViewOthers });

  const activeCount = useMemo(() => {
    let n = 0;
    if (filters.range && filters.range !== "this_month") n += 1;
    if (filters.source) n += 1;
    if (filters.ownerEmployeeId) n += 1;
    if (filters.dateFrom || filters.dateTo) n += 1;
    if (filters.hour !== undefined && filters.hour !== null) n += 1;
    return n;
  }, [filters]);

  return (
    <div className="space-y-2">
      <div className="lg:hidden">
        <Button
          type="button"
          size="sm"
          variant={activeCount > 0 ? "default" : "outline"}
          className="relative min-h-11 w-full touch-manipulation rounded-xl"
          onClick={() => setOpen(true)}
        >
          <SlidersHorizontal className="me-1.5 h-3.5 w-3.5" />
          {t("crm.filters.title")}
          {activeCount > 0 ? (
            <span className="ms-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 font-mono text-[10px] font-bold text-white">
              {activeCount}
            </span>
          ) : (
            <ChevronDown className="ms-auto h-4 w-4 opacity-60" />
          )}
        </Button>
      </div>

      <div className="hidden lg:block">
        <DashboardFilterFields
          filters={filters}
          employees={employees}
          showOwnerFilter={showOwnerFilter}
          showInteractionFilters={showInteractionFilters}
          onFiltersChange={onFiltersChange}
        />
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          className={cn(
            "inset-x-0 bottom-0 top-auto h-auto max-h-[min(88dvh,40rem)] max-w-none gap-0 rounded-t-2xl border-s-0 border-t p-0",
            "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
            "rtl:data-[state=closed]:slide-out-to-bottom rtl:data-[state=open]:slide-in-from-bottom"
          )}
        >
          <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border/80" aria-hidden />
          <SheetHeader className="border-b border-border/60 px-4 py-3 pe-14">
            <SheetTitle>{t("crm.filters.title")}</SheetTitle>
            <SheetDescription>{t("crm.filters.sheetHint")}</SheetDescription>
          </SheetHeader>
          <div className="overflow-y-auto px-4 py-3">
            <DashboardFilterFields
              filters={filters}
              employees={employees}
              showOwnerFilter={showOwnerFilter}
              showInteractionFilters={showInteractionFilters}
              stacked
              onFiltersChange={onFiltersChange}
            />
          </div>
          <div className="border-t border-border/60 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Button
              type="button"
              className="min-h-11 w-full touch-manipulation"
              onClick={() => setOpen(false)}
            >
              {t("crm.filters.done")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
