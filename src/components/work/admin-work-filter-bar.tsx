"use client";

import { Search } from "lucide-react";
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

  return (
    <div className="mt-4 flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
            className="h-10 rounded-xl ps-9"
          />
        </div>
        {tab === "tasks" ? (
          <Select
            value={assigneeFilter || "all"}
            onValueChange={(v) => setAssigneeFilter(v === "all" ? "" : v)}
          >
            <SelectTrigger className="h-10 w-full rounded-xl sm:w-[220px]">
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
        <div className="flex flex-wrap gap-1.5">
          {tab === "tasks"
            ? (
                [
                  ["all", t("common.all")],
                  ["todo", t("ops.statusTodo")],
                  ["in_progress", t("ops.statusInProgress")],
                  ["completed", t("ops.statusCompleted")],
                  ["overdue", t("ops.due.overdue")],
                ] as const
              ).map(([id, label]) => (
                <Button
                  key={id}
                  type="button"
                  size="sm"
                  variant={taskFilter === id ? "default" : "outline"}
                  className="h-8 rounded-full px-3 text-[12px]"
                  onClick={() => setTaskFilter(id)}
                >
                  {label}
                </Button>
              ))
            : (
                [
                  ["all", t("common.all")],
                  ["today", t("workAdmin.when.today")],
                  ["upcoming", t("workAdmin.when.upcoming")],
                  ["past", t("workAdmin.when.past")],
                ] as const
              ).map(([id, label]) => (
                <Button
                  key={id}
                  type="button"
                  size="sm"
                  variant={meetingFilter === id ? "default" : "outline"}
                  className="h-8 rounded-full px-3 text-[12px]"
                  onClick={() => setMeetingFilter(id)}
                >
                  {label}
                </Button>
              ))}
        </div>
      </div>
      {tab === "tasks" && assigneeFilter ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] text-muted-foreground">
            {t("workAdmin.filteringByAssignee")}
          </span>
          <button
            type="button"
            onClick={() => setAssigneeFilter("")}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/[0.08] px-2.5 py-1 text-[12px] font-medium text-primary transition-colors hover:bg-primary/[0.14]"
          >
            {assigneeFilterName}
            <span className="text-[11px] opacity-70">×</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
