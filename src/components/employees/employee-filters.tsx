"use client";

import { LayoutGrid, List, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilterShell } from "@/components/shared/filter-shell";
import { DEPARTMENTS } from "@/constants";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import type { Department, EmployeeStatus, ViewMode } from "@/types";

export type EmployeeSort =
  | "name_asc"
  | "name_desc"
  | "department"
  | "join_date";

export interface EmployeeFilterValues {
  query: string;
  department: Department | "all";
  status: EmployeeStatus | "all";
  sort: EmployeeSort;
}

interface EmployeeFiltersProps {
  values: EmployeeFilterValues;
  viewMode: ViewMode;
  onChange: (values: EmployeeFilterValues) => void;
  onViewModeChange: (mode: ViewMode) => void;
}

export function EmployeeFilters({
  values,
  viewMode,
  onChange,
  onViewModeChange,
}: EmployeeFiltersProps) {
  const { t } = useTranslation();

  const statusOptions: { value: EmployeeStatus | "all"; label: string }[] = [
    { value: "all", label: t("employees.allStatuses") },
    { value: "active", label: t("status.active") },
    { value: "inactive", label: t("status.inactive") },
    { value: "on_leave", label: t("status.on_leave") },
  ];

  return (
    <FilterShell>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="employee-search">{t("common.searchAria")}</Label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="employee-search"
                type="search"
                placeholder={t("employees.searchPlaceholder")}
                value={values.query}
                onChange={(e) => onChange({ ...values, query: e.target.value })}
                className="ps-9"
                aria-label={t("common.searchAria")}
              />
            </div>
          </div>

          <div className="grid flex-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="department-filter">{t("common.department")}</Label>
              <Select
                value={values.department}
                onValueChange={(value) =>
                  onChange({
                    ...values,
                    department: value as Department | "all",
                  })
                }
              >
                <SelectTrigger
                  id="department-filter"
                  aria-label={t("common.department")}
                >
                  <SelectValue placeholder={t("employees.allDepartments")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("employees.allDepartments")}
                  </SelectItem>
                  {DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {t(`departments.${dept}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status-filter">{t("common.status")}</Label>
              <Select
                value={values.status}
                onValueChange={(value) =>
                  onChange({
                    ...values,
                    status: value as EmployeeStatus | "all",
                  })
                }
              >
                <SelectTrigger
                  id="status-filter"
                  aria-label={t("common.status")}
                >
                  <SelectValue placeholder={t("employees.allStatuses")} />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sort-filter">{t("employees.sortBy")}</Label>
              <Select
                value={values.sort}
                onValueChange={(value) =>
                  onChange({
                    ...values,
                    sort: value as EmployeeSort,
                  })
                }
              >
                <SelectTrigger
                  id="sort-filter"
                  aria-label={t("employees.sortBy")}
                >
                  <SelectValue placeholder={t("employees.sortBy")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name_asc">
                    {t("employees.sortNameAsc")}
                  </SelectItem>
                  <SelectItem value="name_desc">
                    {t("employees.sortNameDesc")}
                  </SelectItem>
                  <SelectItem value="department">
                    {t("employees.sortDepartment")}
                  </SelectItem>
                  <SelectItem value="join_date">
                    {t("employees.sortJoinDate")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div
            className="inline-flex self-start rounded-xl border border-border/70 bg-background/50 p-1 lg:self-end"
            role="group"
            aria-label={t("common.filters")}
          >
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className={cn(
                "rounded-lg",
                viewMode === "grid" &&
                  "bg-primary/15 text-primary hover:bg-primary/20"
              )}
              onClick={() => onViewModeChange("grid")}
              aria-label={t("common.viewGrid")}
              aria-pressed={viewMode === "grid"}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className={cn(
                "rounded-lg",
                viewMode === "table" &&
                  "bg-primary/15 text-primary hover:bg-primary/20"
              )}
              onClick={() => onViewModeChange("table")}
              aria-label={t("common.viewTable")}
              aria-pressed={viewMode === "table"}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </FilterShell>
  );
}
