"use client";

import { CalendarDays, FolderKanban, ListTodo, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "@/hooks/use-translation";
import type { PanelTab } from "@/components/work/admin-work-panel-types";

export function AdminWorkTabsBar({
  tab,
  tasksCount,
  meetingsCount,
  projectsCount,
  onCreateTask,
  onCreateMeeting,
  onCreateProject,
}: {
  tab: PanelTab;
  tasksCount: number;
  meetingsCount: number;
  projectsCount: number;
  onCreateTask: () => void;
  onCreateMeeting: () => void;
  onCreateProject: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3 sm:gap-3.5 lg:flex-row lg:items-center lg:justify-between">
      <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-2xl bg-muted/60 p-1.5 sm:inline-grid sm:w-auto sm:rounded-2xl">
        <TabsTrigger
          value="tasks"
          className="min-h-11 gap-1.5 rounded-xl px-2.5 text-[13px] font-semibold touch-manipulation sm:min-h-11 sm:px-4"
        >
          <ListTodo className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
          <span className="truncate">{t("workAdmin.tabTasks")}</span>
          <span className="ms-0.5 font-mono text-[10px] opacity-70 sm:ms-1">
            {tasksCount}
          </span>
        </TabsTrigger>
        <TabsTrigger
          value="meetings"
          className="min-h-11 gap-1.5 rounded-xl px-2.5 text-[13px] font-semibold touch-manipulation sm:min-h-11 sm:px-4"
        >
          <CalendarDays className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
          <span className="truncate">{t("workAdmin.tabMeetings")}</span>
          <span className="ms-0.5 font-mono text-[10px] opacity-70 sm:ms-1">
            {meetingsCount}
          </span>
        </TabsTrigger>
        <TabsTrigger
          value="projects"
          className="min-h-11 gap-1.5 rounded-xl px-2.5 text-[13px] font-semibold touch-manipulation sm:min-h-11 sm:px-4"
        >
          <FolderKanban className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
          <span className="truncate">{t("workAdmin.tabProjects")}</span>
          <span className="ms-0.5 font-mono text-[10px] opacity-70 sm:ms-1">
            {projectsCount}
          </span>
        </TabsTrigger>
      </TabsList>
      {tab === "tasks" ? (
        <Button
          type="button"
          className="h-11 w-full touch-manipulation rounded-xl text-[14px] font-semibold sm:h-10 sm:w-auto sm:rounded-lg sm:text-sm"
          onClick={onCreateTask}
        >
          <Plus className="h-4 w-4" />
          {t("workAdmin.addTask")}
        </Button>
      ) : tab === "meetings" ? (
        <Button
          type="button"
          className="h-11 w-full touch-manipulation rounded-xl text-[14px] font-semibold sm:h-10 sm:w-auto sm:rounded-lg sm:text-sm"
          onClick={onCreateMeeting}
        >
          <Plus className="h-4 w-4" />
          {t("workAdmin.addMeeting")}
        </Button>
      ) : (
        <Button
          type="button"
          className="h-11 w-full touch-manipulation rounded-xl text-[14px] font-semibold sm:h-10 sm:w-auto sm:rounded-lg sm:text-sm"
          onClick={onCreateProject}
        >
          <Plus className="h-4 w-4" />
          {t("workAdmin.addProject")}
        </Button>
      )}
    </div>
  );
}
