"use client";

import { useMemo, useState } from "react";
import { ar as arLocale, enUS } from "date-fns/locale";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { FilterShell } from "@/components/shared/filter-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import { ReportDateRangeFilter } from "./report-filters-date-range";
import { ReportFiltersActions } from "./report-filters-actions";
import { ReportSelectFilters } from "./report-filters-selects";
import {
  createDefaultReportFilters,
  DEFAULT_FILTERS,
  type ReportFilterValues,
} from "./report-filters-types";

export type { ReportFilterValues } from "./report-filters-types";
export {
  createDefaultReportFilters,
  DEFAULT_FILTERS,
} from "./report-filters-types";

interface ReportFiltersProps {
  value: ReportFilterValues;
  onChange: (value: ReportFilterValues) => void;
  employees?: { id: string; name: string }[];
}

function countActiveFilters(value: ReportFilterValues): number {
  let count = 0;
  if (value.range?.from) count += 1;
  if (value.department !== "all") count += 1;
  if (value.status !== "all") count += 1;
  if (value.employee !== "all") count += 1;
  if (value.location !== "all") count += 1;
  if (value.shift !== "all") count += 1;
  if (value.workMode !== "all") count += 1;
  if (value.leaveType !== "all") count += 1;
  return count;
}

export function ReportFilters({
  value,
  onChange,
  employees = [],
}: ReportFiltersProps) {
  const { t, locale } = useTranslation();
  const dateLocale = locale === "ar" ? arLocale : enUS;
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeCount = useMemo(() => countActiveFilters(value), [value]);

  return (
    <FilterShell sticky className="min-w-0 max-w-full overflow-x-clip">
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between gap-2 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            aria-expanded={mobileOpen}
            className="flex min-h-11 min-w-0 flex-1 touch-manipulation items-center gap-2 rounded-xl border border-border/80 bg-muted/30 px-3 py-2 text-start transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-card">
              <SlidersHorizontal className="h-3.5 w-3.5 text-primary" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold">
                {t("analytics.filtersTitle")}
              </span>
              <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                {activeCount > 0
                  ? t("analytics.filtersActive", { count: activeCount })
                  : t("analytics.filtersHint")}
              </span>
            </span>
            {activeCount > 0 ? (
              <Badge variant="secondary" className="shrink-0 tabular-nums">
                {activeCount}
              </Badge>
            ) : null}
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                mobileOpen && "rotate-180"
              )}
              aria-hidden
            />
          </button>
          {activeCount > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-11 shrink-0 touch-manipulation px-3"
              onClick={() => onChange(createDefaultReportFilters())}
            >
              {t("analytics.resetFilters")}
            </Button>
          ) : null}
        </div>

        <div
          className={cn(
            "space-y-4",
            !mobileOpen && "hidden lg:block"
          )}
        >
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ReportDateRangeFilter
              range={value.range}
              onChange={(range) => onChange({ ...value, range })}
              dateLocale={dateLocale}
            />
            <ReportSelectFilters
              value={value}
              onChange={onChange}
              employees={employees}
            />
          </div>

          <ReportFiltersActions
            onReset={() => onChange(createDefaultReportFilters())}
          />
        </div>
      </div>
    </FilterShell>
  );
}
