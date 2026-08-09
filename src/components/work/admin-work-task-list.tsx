"use client";

import { ListTodo, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkTasksTable } from "@/components/work/work-tasks-table";
import { useTranslation } from "@/hooks/use-translation";
import type { Employee } from "@/types";
import type { WorkTask } from "@/types/work";

export function AdminWorkTaskList({
  tasks,
  employeeMap,
  onView,
  onEdit,
  onDeleteRequest,
  onCreateTask,
}: {
  tasks: WorkTask[];
  employeeMap: Map<string, Employee>;
  assigneeFilter: string;
  onSelectAssignee: (id: string) => void;
  dateLocale: unknown;
  onView: (task: WorkTask) => void;
  onEdit: (task: WorkTask) => void;
  onDeleteRequest: (task: WorkTask) => void;
  onCreateTask: () => void;
}) {
  const { t } = useTranslation();

  if (tasks.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/80 px-4 py-14 text-center">
        <ListTodo className="mx-auto h-8 w-8 text-muted-foreground/50" />
        <p className="mt-3 text-sm font-medium text-foreground">
          {t("workAdmin.emptyTasks")}
        </p>
        <p className="mt-1 text-[12px] text-muted-foreground">
          {t("workAdmin.emptyTasksHint")}
        </p>
        <Button
          type="button"
          className="mt-4"
          size="sm"
          onClick={onCreateTask}
        >
          <Plus className="h-4 w-4" />
          {t("workAdmin.addTask")}
        </Button>
      </div>
    );
  }

  return (
    <WorkTasksTable
      tasks={tasks}
      employees={employeeMap}
      showAssignee
      onView={onView}
      onEdit={onEdit}
      onDelete={onDeleteRequest}
      emptyTitle={t("workAdmin.emptyTasks")}
      emptyDesc={t("workAdmin.emptyTasksHint")}
    />
  );
}
