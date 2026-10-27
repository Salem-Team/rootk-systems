"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminWorkFilterBar } from "@/components/work/admin-work-filter-bar";
import { WorkTasksTable } from "@/components/work/work-tasks-table";
import { useTranslation } from "@/hooks/use-translation";
import { staggerDense } from "@/lib/animations";
import { employeeOwnsPersonalTask } from "@/lib/work-utils";
import { cn } from "@/lib/utils";
import type { OriginFilter } from "@/components/work/employee-work-hub-types";
import type {
  TaskFilter,
  TaskPriorityFilter,
} from "@/components/work/admin-work-panel-types";
import type { TaskListFacets } from "@/lib/work/task-list-filters";
import type { WorkTask } from "@/types/work";

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "default" : "outline"}
      className={cn(
        "h-8 rounded-full px-3 text-[12px]",
        active && "shadow-none"
      )}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

export function EmployeeWorkTaskPanel({
  tasks,
  visibleTasks,
  selectedTask,
  originFilter,
  setOriginFilter,
  query,
  setQuery,
  filter,
  setFilter,
  priorityFilter,
  setPriorityFilter,
  assigneeFilter,
  setAssigneeFilter,
  assigneeOptions,
  assigneeFilterName,
  taskFacets,
  hasActiveTaskFilters,
  clearTaskFilters,
  workEmployeeId,
  userId,
  onSelectTask,
  onCreateTask,
  onMarkDone,
  onEditTask,
  onDeleteTask,
}: {
  tasks: WorkTask[];
  visibleTasks: WorkTask[];
  selectedTask: WorkTask | null;
  originFilter: OriginFilter;
  setOriginFilter: (v: OriginFilter) => void;
  query: string;
  setQuery: (v: string) => void;
  filter: TaskFilter;
  setFilter: (v: TaskFilter) => void;
  priorityFilter: TaskPriorityFilter;
  setPriorityFilter: (v: TaskPriorityFilter) => void;
  assigneeFilter: string;
  setAssigneeFilter: (v: string) => void;
  assigneeOptions: { id: string; count: number; name: string }[];
  assigneeFilterName: string;
  taskFacets: TaskListFacets;
  hasActiveTaskFilters: boolean;
  clearTaskFilters: () => void;
  workEmployeeId: string;
  userId: string;
  onSelectTask: (id: string) => void;
  onCreateTask: () => void;
  onMarkDone: (id: string) => void;
  onEditTask: (task: WorkTask) => void;
  onDeleteTask: (task: WorkTask) => void;
}) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

  return (
    <>
      <motion.div
        variants={reduceMotion ? undefined : staggerDense}
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
        className="mb-3 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
      >
        <div className="flex flex-wrap gap-1.5">
          {(["all", "assigned", "personal"] as const).map((f) => (
            <FilterChip
              key={f}
              active={originFilter === f}
              onClick={() => setOriginFilter(f)}
            >
              {f === "all"
                ? t("common.all")
                : f === "assigned"
                  ? t("workHub.originAssigned")
                  : t("workHub.originPersonal")}
              <span className="ms-1.5 font-mono text-[10px] opacity-70">
                {f === "all"
                  ? tasks.length
                  : tasks.filter((x) => (x.origin ?? "assigned") === f).length}
              </span>
            </FilterChip>
          ))}
        </div>
        <Button type="button" size="sm" onClick={onCreateTask}>
          <Plus className="h-3.5 w-3.5" />
          {t("workHub.addPersonalTask")}
        </Button>
      </motion.div>

      <AdminWorkFilterBar
        tab="tasks"
        query={query}
        setQuery={setQuery}
        taskFilter={filter}
        setTaskFilter={setFilter}
        priorityFilter={priorityFilter}
        setPriorityFilter={setPriorityFilter}
        meetingFilter="all"
        setMeetingFilter={() => undefined}
        assigneeFilter={assigneeFilter}
        setAssigneeFilter={setAssigneeFilter}
        assigneeOptions={assigneeOptions}
        assigneeFilterName={assigneeFilterName}
        facets={taskFacets}
        resultCount={visibleTasks.length}
        hasActiveFilters={hasActiveTaskFilters}
        onClearFilters={clearTaskFilters}
      />

      <div className="mt-3">
        <WorkTasksTable
          tasks={visibleTasks}
          selectedId={selectedTask?.id}
          onSelect={(task) => onSelectTask(task.id)}
          onDone={(task) => onMarkDone(task.id)}
          onEdit={onEditTask}
          onDelete={onDeleteTask}
          canManage={(task) =>
            employeeOwnsPersonalTask(task, workEmployeeId, userId)
          }
          emptyTitle={
            hasActiveTaskFilters
              ? t("workAdmin.emptyFilteredTasks")
              : t("ops.noTasks")
          }
          emptyDesc={
            hasActiveTaskFilters
              ? t("workAdmin.emptyFilteredTasksHint")
              : t("workHub.emptyTasksDesc")
          }
        />
      </div>
    </>
  );
}
