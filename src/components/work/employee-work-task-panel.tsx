"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkTasksTable } from "@/components/work/work-tasks-table";
import { statusLabelKey } from "@/components/work/employee-work-hub-types";
import { useTranslation } from "@/hooks/use-translation";
import { staggerDense } from "@/lib/animations";
import { employeeOwnsPersonalTask } from "@/lib/work-utils";
import { cn } from "@/lib/utils";
import type { OriginFilter } from "@/components/work/employee-work-hub-types";
import type { TaskStatus, WorkTask } from "@/types/work";

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
  filter,
  setFilter,
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
  filter: TaskStatus | "all";
  setFilter: (v: TaskStatus | "all") => void;
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
        <div className="flex flex-wrap items-center gap-1.5">
          {(["all", "todo", "in_progress", "completed"] as const).map((f) => (
            <FilterChip
              key={f}
              active={filter === f}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? t("common.all") : t(statusLabelKey(f))}
            </FilterChip>
          ))}
          <Button type="button" size="sm" onClick={onCreateTask}>
            <Plus className="h-3.5 w-3.5" />
            {t("workHub.addPersonalTask")}
          </Button>
        </div>
      </motion.div>

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
        emptyTitle={t("ops.noTasks")}
        emptyDesc={t("workHub.emptyTasksDesc")}
      />
    </>
  );
}
