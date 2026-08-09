"use client";

import { ar as arLocale, enUS } from "date-fns/locale";
import { CalendarDays, ListTodo, Loader2, Target } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmployeeWorkHero } from "@/components/work/employee-work-hero";
import { EmployeeWorkTaskPanel } from "@/components/work/employee-work-task-panel";
import { EmployeeWorkMeetingsPanel } from "@/components/work/employee-work-meetings-panel";
import { EmployeeWorkDayPanel } from "@/components/work/employee-work-day-panel";
import { EmployeeWorkMobileSheet } from "@/components/work/employee-work-mobile-sheet";
import { EmployeeWorkComposer } from "@/components/work/employee-work-composer";
import { TaskCompletionEvidenceDialog } from "@/components/work/task-completion-evidence-dialog";
import { useEmployeeWorkHubData } from "@/components/work/use-employee-work-hub-data";
import { useEmployeeWorkHubActions } from "@/components/work/use-employee-work-hub-actions";
import type { WorkTab } from "@/components/work/employee-work-hub-types";
import { getWorkEmployeeIdFromUser, useSessionStore } from "@/stores/session-store";
import { useTranslation } from "@/hooks/use-translation";

export function EmployeeWorkHub() {
  const { t, locale } = useTranslation();
  const user = useSessionStore((s) => s.user);
  const workEmployeeId = useSessionStore((s) =>
    getWorkEmployeeIdFromUser(s.user)
  );
  const dateLocale = locale === "ar" ? arLocale : enUS;

  const data = useEmployeeWorkHubData(workEmployeeId);
  const actions = useEmployeeWorkHubActions({
    tasks: data.tasks,
    setTasks: data.setTasks,
    workEmployeeId,
    userId: user?.id ?? "",
    selectedTaskId: data.selectedTaskId,
    setSelectedTaskId: data.setSelectedTaskId,
    selectedMeetingId: data.selectedMeetingId,
    setSelectedMeetingId: data.setSelectedMeetingId,
    reload: data.reload,
  });

  function openMeetingFromTask(id: string) {
    data.setTab("meetings");
    data.selectMeeting(id);
  }

  if (data.loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <EmployeeWorkHero
        user={user}
        workEmployeeId={workEmployeeId}
        openCount={data.openTasks.length}
        todayMeetingsCount={data.todayMeetings.length}
        overdueCount={data.overdue.length}
        checklistPct={data.checklistPct}
        onAddTask={actions.openCreateTask}
        onAddMeeting={actions.openCreateMeeting}
      />

      <Tabs
        value={data.tab}
        onValueChange={(v) => data.setTab(v as WorkTab)}
        className="space-y-4"
      >
        <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-xl bg-muted/60 p-1 sm:inline-grid sm:w-auto sm:rounded-2xl sm:p-1.5">
          <TabsTrigger
            value="tasks"
            className="min-h-10 gap-1 rounded-lg px-2 text-[11px] sm:min-h-11 sm:rounded-xl sm:px-4 sm:text-[13px]"
          >
            <ListTodo className="hidden h-3.5 w-3.5 sm:me-1.5 sm:inline" aria-hidden />
            {t("workHub.tabTasks")}
          </TabsTrigger>
          <TabsTrigger
            value="meetings"
            className="min-h-10 gap-1 rounded-lg px-2 text-[11px] sm:min-h-11 sm:rounded-xl sm:px-4 sm:text-[13px]"
          >
            <CalendarDays className="hidden h-3.5 w-3.5 sm:me-1.5 sm:inline" aria-hidden />
            {t("workHub.tabMeetings")}
          </TabsTrigger>
          <TabsTrigger
            value="day"
            className="min-h-10 gap-1 rounded-lg px-2 text-[11px] sm:min-h-11 sm:rounded-xl sm:px-4 sm:text-[13px]"
          >
            <Target className="hidden h-3.5 w-3.5 sm:me-1.5 sm:inline" aria-hidden />
            {t("workHub.tabDay")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-0 outline-none">
          <EmployeeWorkTaskPanel
            tasks={data.tasks}
            visibleTasks={data.visibleTasks}
            meetings={data.meetings}
            selectedTask={data.selectedTask}
            originFilter={data.originFilter}
            setOriginFilter={data.setOriginFilter}
            filter={data.filter}
            setFilter={data.setFilter}
            nameOf={data.nameOf}
            workEmployeeId={workEmployeeId}
            userId={user?.id ?? ""}
            onSelectTask={data.selectTask}
            onCreateTask={actions.openCreateTask}
            onCycleStatus={(id) => void actions.cycleTaskStatus(id)}
            onToggleSub={(taskId, subId) => void actions.toggleSubItem(taskId, subId)}
            onOpenMeeting={openMeetingFromTask}
            onEditTask={actions.openEditTask}
            onDeleteTask={(task) => void actions.handleDeletePersonal("task", task.id)}
          />
        </TabsContent>

        <TabsContent value="meetings" className="mt-0 outline-none">
          <EmployeeWorkMeetingsPanel
            todayMeetings={data.filteredTodayMeetings}
            upcomingMeetings={data.filteredUpcomingMeetings}
            selectedMeeting={data.selectedMeeting}
            originFilter={data.originFilter}
            setOriginFilter={data.setOriginFilter}
            dateLocale={dateLocale}
            nameOf={data.nameOf}
            workEmployeeId={workEmployeeId}
            userId={user?.id ?? ""}
            onSelectMeeting={data.selectMeeting}
            onCreateMeeting={actions.openCreateMeeting}
            onEditMeeting={actions.openEditMeeting}
            onDeleteMeeting={(meeting) =>
              void actions.handleDeletePersonal("meeting", meeting.id)
            }
          />
        </TabsContent>

        <TabsContent value="day" className="mt-0 outline-none">
          <EmployeeWorkDayPanel
            checklist={data.checklist}
            setChecklist={data.setChecklist}
            goals={data.goals}
          />
        </TabsContent>
      </Tabs>

      <EmployeeWorkMobileSheet
        open={data.mobileDetailOpen}
        isMobile={data.isMobile}
        onOpenChange={data.setMobileDetailOpen}
        tab={data.tab}
        selectedTask={data.selectedTask}
        selectedMeeting={data.selectedMeeting}
        meetings={data.meetings}
        nameOf={data.nameOf}
        dateLocale={dateLocale}
        workEmployeeId={workEmployeeId}
        userId={user?.id ?? ""}
        onCycleStatus={(id) => void actions.cycleTaskStatus(id)}
        onToggleSub={(taskId, subId) => void actions.toggleSubItem(taskId, subId)}
        onOpenMeeting={openMeetingFromTask}
        onEditTask={actions.openEditTask}
        onDeleteTask={(task) => void actions.handleDeletePersonal("task", task.id)}
        onEditMeeting={actions.openEditMeeting}
        onDeleteMeeting={(meeting) =>
          void actions.handleDeletePersonal("meeting", meeting.id)
        }
      />

      <EmployeeWorkComposer
        selfId={workEmployeeId}
        employees={data.employees}
        mode={actions.composerMode}
        onModeChange={(m) => {
          actions.setComposerMode(m);
          if (!m) {
            actions.setEditingTask(null);
            actions.setEditingMeeting(null);
          }
        }}
        editingTask={actions.editingTask}
        editingMeeting={actions.editingMeeting}
        onSaved={data.reload}
      />

      <TaskCompletionEvidenceDialog
        task={actions.evidenceTask}
        open={Boolean(actions.evidenceTask)}
        onOpenChange={(open) => {
          if (!open) actions.setEvidenceTask(null);
        }}
        onCompleted={actions.handleEvidenceCompleted}
      />
    </div>
  );
}
