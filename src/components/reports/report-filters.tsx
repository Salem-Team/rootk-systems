"use client";

import { ar as arLocale, enUS } from "date-fns/locale";
import { FilterShell } from "@/components/shared/filter-shell";
import { useTranslation } from "@/hooks/use-translation";
import { ReportDateRangeFilter } from "./report-filters-date-range";
import { ReportFiltersActions } from "./report-filters-actions";
import { ReportSelectFilters } from "./report-filters-selects";
import { DEFAULT_FILTERS, type ReportFilterValues } from "./report-filters-types";

export type { ReportFilterValues } from "./report-filters-types";
export { DEFAULT_FILTERS } from "./report-filters-types";

interface ReportFiltersProps {
  value: ReportFilterValues;
  onChange: (value: ReportFilterValues) => void;
  employees?: { id: string; name: string }[];
}

export function ReportFilters({
  value,
  onChange,
  employees = [],
}: ReportFiltersProps) {
  const { locale } = useTranslation();
  const dateLocale = locale === "ar" ? arLocale : enUS;

  return (
    <FilterShell>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
          <ReportDateRangeFilter
            range={value.range}
            onChange={(range) => onChange({ ...value, range })}
            dateLocale={dateLocale}
          />
          <ReportSelectFilters value={value} onChange={onChange} employees={employees} />
        </div>

        <ReportFiltersActions
          onReset={() => onChange({ ...DEFAULT_FILTERS, range: undefined })}
        />
      </div>
    </FilterShell>
  );
}

