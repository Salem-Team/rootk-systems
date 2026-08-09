"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Gauge, Search, Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { TargetProgressRing } from "@/components/targets/target-progress-ring";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types";
import type { PerformanceTarget, TargetCategory } from "@/types/targets";
import { buildRoster, initials } from "./performance-report-utils";
import { EmployeeFullReport } from "./employee-full-report";

interface PerformanceReportPanelProps {
  targets: PerformanceTarget[];
  categories: Map<string, TargetCategory>;
  employees: Map<string, Employee>;
  categoryId?: string;
  onView?: (target: PerformanceTarget) => void;
  onEdit?: (target: PerformanceTarget) => void;
  className?: string;
}

/** Admin performance report: roster of assignees + full target/task breakdown. */
export function PerformanceReportPanel({
  targets,
  categories,
  employees,
  categoryId,
  onView,
  onEdit,
  className,
}: PerformanceReportPanelProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const scopedTargets = useMemo(
    () =>
      categoryId
        ? targets.filter((x) => x.categoryId === categoryId)
        : targets,
    [targets, categoryId]
  );

  const roster = useMemo(
    () => buildRoster(scopedTargets, employees),
    [scopedTargets, employees]
  );

  const filteredRoster = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return roster;
    return roster.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        row.department.toLowerCase().includes(q)
    );
  }, [roster, query]);

  useEffect(() => {
    if (selectedId && !roster.some((r) => r.employeeId === selectedId)) {
      setSelectedId(null);
    }
  }, [roster, selectedId]);

  if (roster.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title={t("targets.report.empty")}
        description={t("targets.report.emptyDesc")}
        className={className}
      />
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <section className="surface-panel overflow-hidden">
        <div className="panel-header">
          <h3 className="flex items-center gap-2 text-[0.95rem] font-semibold tracking-tight">
            <Gauge className="h-3.5 w-3.5 text-primary" aria-hidden />
            {t("targets.report.title")}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t("targets.report.description")}
          </p>
        </div>
        <div className="panel-body space-y-3">
          <div className="relative w-full max-w-2xl">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("targets.report.searchPeople")}
              className="h-11 rounded-xl ps-9"
            />
          </div>
          <p className="text-[12px] text-muted-foreground">
            {t("targets.report.peopleCount", { count: filteredRoster.length })}
          </p>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(220px,260px)_minmax(0,1fr)] lg:gap-5">
        <aside className="surface-panel overflow-hidden lg:sticky lg:top-20 lg:self-start">
          <div className="border-b border-border/60 px-3.5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {t("targets.report.roster")}
            </p>
          </div>
          <ul className="max-h-[min(70vh,640px)] space-y-0.5 overflow-y-auto p-2.5">
            {filteredRoster.map((row, index) => {
              const active = selectedId === row.employeeId;
              return (
                <li key={row.employeeId}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(row.employeeId)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-start transition-colors",
                      active
                        ? "bg-primary/[0.08] text-primary"
                        : "hover:bg-muted/60"
                    )}
                    aria-pressed={active}
                  >
                    <span className="w-5 shrink-0 text-center font-mono text-[10px] text-muted-foreground">
                      {index + 1}
                    </span>
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="text-[10px]">
                        {initials(row.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium">
                        {row.name}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {row.department || t("targets.report.noDepartment")}
                        {" · "}
                        {row.completed}/{row.total}
                      </span>
                    </span>
                    <TargetProgressRing
                      percentage={row.score}
                      size={40}
                      strokeWidth={4}
                      tone={
                        row.score >= 80
                          ? "success"
                          : row.score >= 55
                            ? "primary"
                            : row.score >= 35
                              ? "warning"
                              : "danger"
                      }
                    />
                  </button>
                </li>
              );
            })}
            {filteredRoster.length === 0 ? (
              <li className="px-3 py-8 text-center text-[13px] text-muted-foreground">
                {t("common.noResults")}
              </li>
            ) : null}
          </ul>
        </aside>

        <div className="min-w-0">
          {selectedId ? (
            <EmployeeFullReport
              employeeId={selectedId}
              categories={categories}
              employees={employees}
              categoryId={categoryId}
              onBack={() => setSelectedId(null)}
              onView={onView}
              onEdit={onEdit}
            />
          ) : (
            <EmptyState
              icon={ClipboardList}
              title={t("targets.report.selectPerson")}
              description={t("targets.report.selectPersonDesc")}
            />
          )}
        </div>
      </div>
    </div>
  );
}
