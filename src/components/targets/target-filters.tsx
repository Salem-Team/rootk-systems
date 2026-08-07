"use client";

import { useMemo } from "react";
import { Search, X } from "lucide-react";
import { FilterShell } from "@/components/shared/filter-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "@/hooks/use-translation";
import type { Employee } from "@/types";
import type { TargetFilters } from "@/types/targets";

const ALL = "all";

interface TargetFiltersBarProps {
  value: TargetFilters;
  onChange: (next: TargetFilters) => void;
  /** Workforce used for assignee filter options. */
  employees?: Employee[];
  /** Optional counts of targets per assignee (for option labels). */
  assigneeCounts?: Map<string, number>;
  className?: string;
}

/** Sticky-friendly filter toolbar for the targets list / dashboard. */
export function TargetFiltersBar({
  value,
  onChange,
  employees = [],
  assigneeCounts,
  className,
}: TargetFiltersBarProps) {
  const { t } = useTranslation();

  const assigneeOptions = useMemo(() => {
    const withTargets =
      assigneeCounts && assigneeCounts.size > 0
        ? employees.filter((e) => (assigneeCounts.get(e.id) ?? 0) > 0)
        : employees;
    return [...withTargets].sort((a, b) => a.name.localeCompare(b.name));
  }, [employees, assigneeCounts]);

  const hasActiveFilters = Boolean(
    value.search ||
      value.status ||
      value.priority ||
      value.riskLevel ||
      value.employeeId ||
      value.delayedOnly
  );

  function patch(next: Partial<TargetFilters>) {
    onChange({ ...value, ...next });
  }

  function clearAll() {
    // Preserve category selection owned by the hub sidebar.
    onChange(value.categoryId ? { categoryId: value.categoryId } : {});
  }

  const selectedAssignee = value.employeeId
    ? employees.find((e) => e.id === value.employeeId)
    : undefined;

  return (
    <FilterShell className={className}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={value.search ?? ""}
              onChange={(e) => patch({ search: e.target.value })}
              placeholder={t("targets.filters.searchPlaceholder")}
              className="h-10 rounded-xl ps-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex lg:shrink-0 lg:gap-2">
            <Select
              value={value.employeeId || ALL}
              onValueChange={(v) =>
                patch({ employeeId: v === ALL ? undefined : v })
              }
            >
              <SelectTrigger className="h-10 lg:w-48">
                <SelectValue placeholder={t("targets.filters.assignee")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>
                  {t("targets.filters.allAssignees")}
                </SelectItem>
                {assigneeOptions.map((emp) => {
                  const count = assigneeCounts?.get(emp.id);
                  return (
                    <SelectItem key={emp.id} value={emp.id}>
                      {count != null
                        ? `${emp.name} (${count})`
                        : emp.name}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <Select
              value={value.status || ALL}
              onValueChange={(v) =>
                patch({
                  status: v === ALL ? "" : (v as TargetFilters["status"]),
                })
              }
            >
              <SelectTrigger className="h-10 lg:w-36">
                <SelectValue placeholder={t("targets.filters.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>
                  {t("targets.filters.allStatuses")}
                </SelectItem>
                <SelectItem value="draft">{t("targets.status.draft")}</SelectItem>
                <SelectItem value="assigned">
                  {t("targets.status.assigned")}
                </SelectItem>
                <SelectItem value="in_progress">
                  {t("targets.status.in_progress")}
                </SelectItem>
                <SelectItem value="on_track">
                  {t("targets.status.on_track")}
                </SelectItem>
                <SelectItem value="behind_schedule">
                  {t("targets.status.behind_schedule")}
                </SelectItem>
                <SelectItem value="delayed">
                  {t("targets.status.delayed")}
                </SelectItem>
                <SelectItem value="completed">
                  {t("targets.status.completed")}
                </SelectItem>
                <SelectItem value="cancelled">
                  {t("targets.status.cancelled")}
                </SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={value.priority || ALL}
              onValueChange={(v) =>
                patch({
                  priority: v === ALL ? "" : (v as TargetFilters["priority"]),
                })
              }
            >
              <SelectTrigger className="h-10 lg:w-36">
                <SelectValue placeholder={t("targets.filters.priority")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>
                  {t("targets.filters.allPriorities")}
                </SelectItem>
                <SelectItem value="critical">
                  {t("targets.priority.critical")}
                </SelectItem>
                <SelectItem value="high">{t("targets.priority.high")}</SelectItem>
                <SelectItem value="medium">
                  {t("targets.priority.medium")}
                </SelectItem>
                <SelectItem value="low">{t("targets.priority.low")}</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={value.riskLevel || ALL}
              onValueChange={(v) =>
                patch({
                  riskLevel:
                    v === ALL ? "" : (v as TargetFilters["riskLevel"]),
                })
              }
            >
              <SelectTrigger className="h-10 lg:w-32">
                <SelectValue placeholder={t("targets.filters.risk")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>
                  {t("targets.filters.allRisks")}
                </SelectItem>
                <SelectItem value="low">{t("targets.risk.low")}</SelectItem>
                <SelectItem value="medium">{t("targets.risk.medium")}</SelectItem>
                <SelectItem value="high">{t("targets.risk.high")}</SelectItem>
                <SelectItem value="critical">
                  {t("targets.risk.critical")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-3 lg:shrink-0 lg:justify-end lg:gap-4">
            <label className="flex items-center gap-2 whitespace-nowrap text-[13px] font-medium">
              <Switch
                checked={Boolean(value.delayedOnly)}
                onCheckedChange={(checked) => patch({ delayedOnly: checked })}
                aria-label={t("targets.filters.delayedOnly")}
              />
              {t("targets.filters.delayedOnly")}
            </label>
            {hasActiveFilters ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="text-muted-foreground"
              >
                <X className="h-3.5 w-3.5" />
                {t("targets.filters.clear")}
              </Button>
            ) : null}
          </div>
        </div>

        {selectedAssignee ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] text-muted-foreground">
              {t("targets.filters.filteringByAssignee")}
            </span>
            <button
              type="button"
              onClick={() => patch({ employeeId: undefined })}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/[0.08] px-2.5 py-1 text-[12px] font-medium text-primary transition-colors hover:bg-primary/[0.14]"
            >
              {selectedAssignee.name}
              <span className="text-[11px] opacity-70">×</span>
            </button>
          </div>
        ) : null}
      </div>
    </FilterShell>
  );
}
