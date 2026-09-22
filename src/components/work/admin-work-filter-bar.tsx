"use client";

import { Search } from "lucide-react";
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
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import type {
  MeetingFilter,
  PanelTab,
  TaskFilter,
} from "@/components/work/admin-work-panel-types";

export function AdminWorkFilterBar({
  tab,
  query,
  setQuery,
  taskFilter,
  setTaskFilter,
  meetingFilter,
  setMeetingFilter,
  assigneeFilter,
  setAssigneeFilter,
  assigneeOptions,
  assigneeFilterName,
}: {
  tab: PanelTab;
  query: string;
  setQuery: (v: string) => void;
  taskFilter: TaskFilter;
  setTaskFilter: (v: TaskFilter) => void;
  meetingFilter: MeetingFilter;
  setMeetingFilter: (v: MeetingFilter) => void;
  assigneeFilter: string;
  setAssigneeFilter: (v: string) => void;
  assigneeOptions: { id: string; count: number; name: string }[];
  assigneeFilterName: string;
}) {
  const { t } = useTranslation();

  const taskChips = [
    ["all", t("common.all")],
    ["open", t("workAdmin.kpiOpen")],
    ["todo", t("ops.statusTodo")],
    ["in_progress", t("ops.statusInProgress")],
    ["completed", t("ops.statusCompleted")],
    ["overdue", t("ops.due.overdue")],
  ] as const;

  const meetingChips = [
    ["all", t("common.all")],
    ["today", t("workAdmin.when.today")],
    ["upcoming", t("workAdmin.when.upcoming")],
    ["past", t("workAdmin.when.past")],
  ] as const;

  return (
    <FilterShell sticky compact className="mt-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                tab === "tasks"
                  ? t("workAdmin.searchTasks")
                  : t("workAdmin.searchMeetings")
              }
              className="h-11 rounded-xl ps-9 text-base touch-manipulation sm:h-10 sm:text-sm"
            />
          </div>
          {tab === "tasks" ? (
            <Select
              value={assigneeFilter || "all"}
              onValueChange={(v) => setAssigneeFilter(v === "all" ? "" : v)}
            >
              <SelectTrigger className="h-11 w-full rounded-xl text-base touch-manipulation sm:h-10 sm:w-[220px] sm:text-sm">
                <SelectValue placeholder={t("workAdmin.filterAssignee")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("workAdmin.allAssignees")}
                </SelectItem>
                {assigneeOptions.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {`${opt.name} (${opt.count})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>

        <div className="scroll-x -mx-0.5 flex gap-1.5 overflow-x-auto overscroll-x-contain px-0.5 pb-0.5 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
          {tab === "tasks"
            ? taskChips.map(([id, label]) => (
                <Button
                  key={id}
                  type="button"
                  size="sm"
                  variant={taskFilter === id ? "default" : "outline"}
                  className={cn(
                    "h-9 shrink-0 snap-start rounded-full px-3.5 text-[12px] font-semibold touch-manipulation",
                    "sm:h-8 sm:px-3"
                  )}
                  onClick={() => setTaskFilter(id)}
                >
                  {label}
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

        {tab === "tasks" && assigneeFilter ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] text-muted-foreground">
              {t("workAdmin.filteringByAssignee")}
            </span>
            <button
              type="button"
              onClick={() => setAssigneeFilter("")}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-primary/25 bg-primary/[0.08] px-3 py-1.5 text-[12px] font-medium text-primary transition-colors touch-manipulation hover:bg-primary/[0.14]"
            >
              {assigneeFilterName}
              <span className="text-[11px] opacity-70">×</span>
            </button>
          </div>
        ) : null}
      </div>
    </FilterShell>
  );
}
