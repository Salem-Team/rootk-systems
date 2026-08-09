"use client";

import { CalendarDays, ListTodo, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "@/hooks/use-translation";
import type { PanelTab } from "@/components/work/admin-work-panel-types";

export function AdminWorkTabsBar({
  tab,
  tasksCount,
  meetingsCount,
  onCreateTask,
  onCreateMeeting,
}: {
  tab: PanelTab;
  tasksCount: number;
  meetingsCount: number;
  onCreateTask: () => void;
  onCreateMeeting: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl bg-muted/60 p-1 sm:inline-grid sm:w-auto sm:rounded-2xl sm:p-1.5">
        <TabsTrigger
          value="tasks"
          className="min-h-10 gap-1 rounded-lg px-2 text-[12px] sm:min-h-11 sm:rounded-xl sm:px-4 sm:text-[13px]"
        >
          <ListTodo className="hidden h-3.5 w-3.5 sm:me-1.5 sm:inline" aria-hidden />
          {t("workAdmin.tabTasks")}
          <span className="ms-1 font-mono text-[10px] opacity-70 sm:ms-1.5">
            {tasksCount}
          </span>
        </TabsTrigger>
        <TabsTrigger
          value="meetings"
          className="min-h-10 gap-1 rounded-lg px-2 text-[12px] sm:min-h-11 sm:rounded-xl sm:px-4 sm:text-[13px]"
        >
          <CalendarDays className="hidden h-3.5 w-3.5 sm:me-1.5 sm:inline" aria-hidden />
          {t("workAdmin.tabMeetings")}
          <span className="ms-1 font-mono text-[10px] opacity-70 sm:ms-1.5">
            {meetingsCount}
          </span>
        </TabsTrigger>
      </TabsList>
      {tab === "tasks" ? (
        <Button type="button" onClick={onCreateTask}>
          <Plus className="h-4 w-4" />
          {t("workAdmin.addTask")}
        </Button>
      ) : (
        <Button type="button" onClick={onCreateMeeting}>
          <Plus className="h-4 w-4" />
          {t("workAdmin.addMeeting")}
        </Button>
      )}
    </div>
  );
}
