"use client";

import { ar as arLocale, enUS } from "date-fns/locale";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { AdminWorkHero } from "@/components/work/admin-work-hero";
import { AdminWorkTabsBar } from "@/components/work/admin-work-tabs-bar";
import { AdminWorkFilterBar } from "@/components/work/admin-work-filter-bar";
import { AdminWorkTaskList } from "@/components/work/admin-work-task-list";
import { AdminWorkMeetingList } from "@/components/work/admin-work-meeting-list";
import { AdminWorkTaskDialog } from "@/components/work/admin-work-task-dialog";
import { AdminWorkMeetingDialog } from "@/components/work/admin-work-meeting-dialog";
import { AdminWorkDeleteDialog } from "@/components/work/admin-work-delete-dialog";
import { TaskViewSheet } from "@/components/work/task-view-sheet";
import { useAdminWorkPanelData } from "@/components/work/use-admin-work-panel-data";
import { useAdminWorkPanelForms } from "@/components/work/use-admin-work-panel-forms";
import type { PanelTab } from "@/components/work/admin-work-panel-types";
import { getWorkEmployeeIdFromUser, useSessionStore } from "@/stores/session-store";
import { useTranslation } from "@/hooks/use-translation";
import type { WorkMeeting, WorkTask } from "@/types/work";

export function AdminWorkAssignPanel() {
  const { locale } = useTranslation();
  const workEmployeeId = useSessionStore((s) =>
    getWorkEmployeeIdFromUser(s.user)
  );
  const dateLocale = locale === "ar" ? arLocale : enUS;

  const data = useAdminWorkPanelData();
  const forms = useAdminWorkPanelForms({
    tasks: data.tasks,
    workEmployeeId,
    reload: data.reload,
  });

  if (data.loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <AdminWorkHero stats={data.stats} />

      <Tabs
        value={data.tab}
        onValueChange={(v) => {
          data.setTab(v as PanelTab);
          data.setQuery("");
        }}
      >
        <AdminWorkTabsBar
          tab={data.tab}
          tasksCount={data.tasks.length}
          meetingsCount={data.meetings.length}
          onCreateTask={forms.openCreateTask}
          onCreateMeeting={forms.openCreateMeeting}
        />

        <AdminWorkFilterBar
          tab={data.tab}
          query={data.query}
          setQuery={data.setQuery}
          taskFilter={data.taskFilter}
          setTaskFilter={data.setTaskFilter}
          meetingFilter={data.meetingFilter}
          setMeetingFilter={data.setMeetingFilter}
          assigneeFilter={data.assigneeFilter}
          setAssigneeFilter={data.setAssigneeFilter}
          assigneeOptions={data.assigneeOptions}
          assigneeFilterName={data.assigneeFilterName}
        />

        <TabsContent value="tasks" className="mt-4 outline-none">
          <AdminWorkTaskList
            tasks={data.filteredTasks}
            employeeMap={data.employeeMap}
            assigneeFilter={data.assigneeFilter}
            onSelectAssignee={data.setAssigneeFilter}
            dateLocale={dateLocale}
            onView={forms.openViewTask}
            onEdit={forms.openEditTask}
            onDeleteRequest={(task: WorkTask) =>
              forms.setDeleteTarget({ kind: "task", id: task.id, title: task.title })
            }
            onCreateTask={forms.openCreateTask}
          />
        </TabsContent>

        <TabsContent value="meetings" className="mt-4 outline-none">
          <AdminWorkMeetingList
            meetings={data.filteredMeetings}
            employeeMap={data.employeeMap}
            dateLocale={dateLocale}
            locale={locale}
            onEdit={forms.openEditMeeting}
            onDeleteRequest={(meeting: WorkMeeting) =>
              forms.setDeleteTarget({
                kind: "meeting",
                id: meeting.id,
                title: meeting.title,
              })
            }
            onCreateMeeting={forms.openCreateMeeting}
          />
        </TabsContent>
      </Tabs>

      <AdminWorkTaskDialog
        open={forms.taskDialogOpen}
        onOpenChange={forms.setTaskDialogOpen}
        isEditing={Boolean(forms.editingTaskId)}
        busy={forms.busy}
        taskForm={forms.taskForm}
        setTaskForm={forms.setTaskForm}
        editingTask={forms.editingTask}
        employees={data.employees}
        meetings={data.meetings}
        onSave={() => void forms.saveTask()}
      />

      <AdminWorkMeetingDialog
        open={forms.meetingDialogOpen}
        onOpenChange={forms.setMeetingDialogOpen}
        isEditing={Boolean(forms.editingMeetingId)}
        busy={forms.busy}
        meetingForm={forms.meetingForm}
        setMeetingForm={forms.setMeetingForm}
        employees={data.employees}
        onSave={() => void forms.saveMeeting()}
      />

      <AdminWorkDeleteDialog
        target={forms.deleteTarget}
        busy={forms.busy}
        onOpenChange={(open) => {
          if (!open) forms.setDeleteTarget(null);
        }}
        onConfirm={() => void forms.confirmDelete()}
      />

      <TaskViewSheet
        task={forms.viewingTask}
        open={Boolean(forms.viewingTask)}
        onOpenChange={(open) => {
          if (!open) forms.setViewingTask(null);
        }}
        employees={data.employeeMap}
        onEdit={forms.openEditTask}
      />
    </div>
  );
}
