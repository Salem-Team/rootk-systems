"use client";

import { Search, X } from "lucide-react";
import { FilterShell } from "@/components/shared/filter-shell";
import { LtrNum } from "@/components/shared/ltr-num";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/hooks/use-translation";
import type { TaskListFacets } from "@/lib/work/task-list-filters";
import { emptyTaskListFacets } from "@/lib/work/task-list-filters";
import { cn } from "@/lib/utils";
import type {
  MeetingFilter,
  PanelTab,
  TaskFilter,
  TaskPriorityFilter,
} from "@/components/work/admin-work-panel-types";

function withCount(label: string, count: number | undefined) {
  if (count == null) return label;
  return (
    <>
      {label}{" "}
      <LtrNum className="font-mono text-[10px] opacity-75">({count})</LtrNum>
    </>
  );
}

export function AdminWorkFilterBar({
  tab,
  query,
  setQuery,
  taskFilter,
  setTaskFilter,
  priorityFilter = "all",
  setPriorityFilter,
  meetingFilter,
  setMeetingFilter,
  assigneeFilter,
  setAssigneeFilter,
  assigneeOptions,
  assigneeFilterName,
  facets = emptyTaskListFacets(),
  resultCount,
  hasActiveFilters = false,
  onClearFilters,
}: {
  tab: PanelTab;
  query: string;
  setQuery: (v: string) => void;
  taskFilter: TaskFilter;
  setTaskFilter: (v: TaskFilter) => void;
  priorityFilter?: TaskPriorityFilter;
  setPriorityFilter?: (v: TaskPriorityFilter) => void;
  meetingFilter: MeetingFilter;
  setMeetingFilter: (v: MeetingFilter) => void;
  assigneeFilter: string;
  setAssigneeFilter: (v: string) => void;
  assigneeOptions: { id: string; count: number; name: string }[];
  assigneeFilterName: string;
  facets?: TaskListFacets;
  resultCount?: number;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
}) {
  const { t } = useTranslation();

  const taskChips: Array<{ id: TaskFilter; label: string }> = [
    { id: "all", label: t("common.all") },
    { id: "open", label: t("workAdmin.kpiOpen") },
    { id: "todo", label: t("ops.statusTodo") },
    { id: "in_progress", label: t("ops.statusInProgress") },
    { id: "completed", label: t("ops.statusCompleted") },
    { id: "overdue", label: t("ops.due.overdue") },
  ];

  const meetingChips = [
    ["all", t("common.all")],
    ["today", t("workAdmin.when.today")],
    ["upcoming", t("workAdmin.when.upcoming")],
    ["past", t("workAdmin.when.past")],
  ] as const;

  const searchPlaceholder =
    tab === "tasks"
      ? t("workAdmin.searchTasks")
      : t("workAdmin.searchMeetings");

  return (
    <FilterShell sticky compact className="mt-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="h-11 rounded-xl pe-10 ps-9 text-base touch-manipulation sm:h-10 sm:text-sm"
            />
            {query ? (
              <button
                type="button"
                aria-label={t("workAdmin.clearSearch")}
                className="absolute end-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={() => setQuery("")}
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            ) : null}
          </div>

          {tab === "tasks" ? (
            <>
              <Select
                value={priorityFilter}
                onValueChange={(v) =>
                  setPriorityFilter?.(v as TaskPriorityFilter)
                }
              >
                <SelectTrigger className="h-11 w-full rounded-xl text-base touch-manipulation sm:h-10 sm:w-[160px] sm:text-sm">
                  <SelectValue placeholder={t("workAdmin.filterPriority")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {withCount(
                      t("workAdmin.allPriorities"),
                      facets.byPriority.all
                    )}
                  </SelectItem>
                  <SelectItem value="high">
                    {withCount(
                      t("ops.priority.high"),
                      facets.byPriority.high
                    )}
                  </SelectItem>
                  <SelectItem value="medium">
                    {withCount(
                      t("ops.priority.medium"),
                      facets.byPriority.medium
                    )}
                  </SelectItem>
                  <SelectItem value="low">
                    {withCount(t("ops.priority.low"), facets.byPriority.low)}
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={assigneeFilter || "all"}
                onValueChange={(v) => setAssigneeFilter(v === "all" ? "" : v)}
              >
                <SelectTrigger className="h-11 w-full rounded-xl text-base touch-manipulation sm:h-10 sm:w-[200px] sm:text-sm">
                  <SelectValue placeholder={t("workAdmin.filterAssignee")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("workAdmin.allAssignees")}</SelectItem>
                  {assigneeOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {`${opt.name} (${facets.byAssignee[opt.id] ?? opt.count})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="scroll-x -mx-0.5 flex gap-1.5 overflow-x-auto overscroll-x-contain px-0.5 pb-0.5 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
            {tab === "tasks"
              ? taskChips.map((chip) => (
                  <Button
                    key={chip.id}
                    type="button"
                    size="sm"
                    variant={taskFilter === chip.id ? "default" : "outline"}
                    className={cn(
                      "h-9 shrink-0 snap-start rounded-full px-3.5 text-[12px] font-semibold touch-manipulation",
                      "sm:h-8 sm:px-3"
                    )}
                    onClick={() => setTaskFilter(chip.id)}
                  >
                    {withCount(chip.label, facets.byStatus[chip.id])}
                  </Button>
                ))
              : meetingChips.map(([id, label]) => (
                  <Button
                    key={id}
                    type="button"
                    size="sm"
                    variant={meetingFilter === id ? "default" : "outline"}
                    className={cn(
                      "h-9 shrink-0 snap-start rounded-full px-3.5 text-[12px] font-semibold touch-manipulation",
                      "sm:h-8 sm:px-3"
                    )}
                    onClick={() => setMeetingFilter(id)}
                  >
                    {label}
                  </Button>
                ))}
          </div>

          {tab === "tasks" && hasActiveFilters ? (
            <div className="flex flex-wrap items-center gap-2">
              {typeof resultCount === "number" ? (
                <span className="inline-flex min-h-8 items-center rounded-full border border-border/70 bg-muted/40 px-2.5 text-[11px] font-semibold text-muted-foreground">
                  <LtrNum>{resultCount}</LtrNum>
                  <span className="ms-1">{t("workAdmin.resultCount")}</span>
                </span>
              ) : null}
              {assigneeFilter ? (
                <button
                  type="button"
                  onClick={() => setAssigneeFilter("")}
                  className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-primary/25 bg-primary/[0.08] px-2.5 text-[11px] font-medium text-primary transition-colors touch-manipulation hover:bg-primary/[0.14]"
                >
                  {assigneeFilterName}
                  <span className="opacity-70">×</span>
                </button>
              ) : null}
              {onClearFilters ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 rounded-full px-2.5 text-[12px]"
                  onClick={onClearFilters}
                >
                  {t("workAdmin.clearFilters")}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </FilterShell>
  );
}
