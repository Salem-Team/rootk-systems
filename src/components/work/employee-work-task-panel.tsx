"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskDetailCard } from "@/components/work/employee-work-task-detail-card";
import { WorkTasksTable } from "@/components/work/work-tasks-table";
import { statusLabelKey } from "@/components/work/employee-work-hub-types";
import { useTranslation } from "@/hooks/use-translation";
import { easeOutExpo, snappySpring, staggerDense } from "@/lib/animations";
import { employeeOwnsPersonalTask } from "@/lib/work-utils";
import { cn } from "@/lib/utils";
import type { OriginFilter } from "@/components/work/employee-work-hub-types";
import type { TaskStatus, WorkMeeting, WorkTask } from "@/types/work";

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      whileHover={reduceMotion ? undefined : { y: -1 }}
      whileTap={reduceMotion ? undefined : { scale: 0.97 }}
      transition={snappySpring}
    >
      <Button
        type="button"
        size="sm"
        variant={active ? "default" : "outline"}
        className={cn(
          "h-8 rounded-full px-3 text-[12px] transition-shadow",
          active && "shadow-[0_8px_20px_-12px_hsl(var(--primary)/0.7)]"
        )}
        onClick={onClick}
      >
        {children}
      </Button>
    </motion.div>
  );
}

export function EmployeeWorkTaskPanel({
  tasks,
  visibleTasks,
  meetings,
  selectedTask,
  originFilter,
  setOriginFilter,
  filter,
  setFilter,
  nameOf,
  workEmployeeId,
  userId,
  onSelectTask,
  onCreateTask,
  onCycleStatus,
  onMarkDone,
  onToggleSub,
  onOpenMeeting,
  onEditTask,
  onDeleteTask,
}: {
  tasks: WorkTask[];
  visibleTasks: WorkTask[];
  meetings: WorkMeeting[];
  selectedTask: WorkTask | null;
  originFilter: OriginFilter;
  setOriginFilter: (v: OriginFilter) => void;
  filter: TaskStatus | "all";
  setFilter: (v: TaskStatus | "all") => void;
  nameOf: (id: string) => string;
  workEmployeeId: string;
  userId: string;
  onSelectTask: (id: string) => void;
  onCreateTask: () => void;
  onCycleStatus: (id: string) => void;
  onMarkDone: (id: string) => void;
  onToggleSub: (taskId: string, subId: string) => void;
  onOpenMeeting: (id: string) => void;
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
        <div className="flex flex-wrap gap-1.5">
          {(["all", "todo", "in_progress", "completed"] as const).map((f) => (
            <FilterChip
              key={f}
              active={filter === f}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? t("common.status") : t(statusLabelKey(f))}
            </FilterChip>
          ))}
        </div>
      </motion.div>

      <div className="grid gap-4 lg:grid-cols-12">
        <motion.div
          initial={reduceMotion ? false : { y: 10, opacity: 0.01 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, ease: easeOutExpo }}
          className="lg:col-span-7"
        >
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <p className="text-[13px] text-muted-foreground">
              {t("workTable.hint")}
            </p>
            <motion.div
              whileHover={reduceMotion ? undefined : { scale: 1.03 }}
              whileTap={reduceMotion ? undefined : { scale: 0.97 }}
            >
              <Button type="button" size="sm" onClick={onCreateTask}>
                <Plus className="h-3.5 w-3.5" />
                {t("workHub.addPersonalTask")}
              </Button>
            </motion.div>
          </div>
          <WorkTasksTable
            tasks={visibleTasks}
            selectedId={selectedTask?.id}
            onSelect={(task) => onSelectTask(task.id)}
            onDone={(task) => onMarkDone(task.id)}
            emptyTitle={t("ops.noTasks")}
            emptyDesc={t("workHub.emptyTasksDesc")}
          />
        </motion.div>

        <div className="hidden lg:col-span-5 lg:block">
          <AnimatePresence mode="wait">
            {selectedTask ? (
              <motion.div
                key={selectedTask.id}
                initial={reduceMotion ? false : { x: 16, opacity: 0.01, scale: 0.985 }}
                animate={{ x: 0, opacity: 1, scale: 1 }}
                exit={{ x: 10, opacity: 0, scale: 0.99 }}
                transition={{ duration: 0.32, ease: easeOutExpo }}
              >
                <TaskDetailCard
                  task={selectedTask}
                  meetings={meetings}
                  nameOf={nameOf}
                  onCycleStatus={() => onCycleStatus(selectedTask.id)}
                  onToggleSub={(subId) => onToggleSub(selectedTask.id, subId)}
                  onOpenMeeting={onOpenMeeting}
                  onEdit={
                    employeeOwnsPersonalTask(
                      selectedTask,
                      workEmployeeId,
                      userId
                    )
                      ? () => onEditTask(selectedTask)
                      : undefined
                  }
                  onDelete={
                    employeeOwnsPersonalTask(
                      selectedTask,
                      workEmployeeId,
                      userId
                    )
                      ? () => onDeleteTask(selectedTask)
                      : undefined
                  }
                />
              </motion.div>
            ) : (
              <motion.div
                key="empty-detail"
                initial={reduceMotion ? false : { opacity: 0.01, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-gradient-to-b from-muted/30 to-transparent px-6 text-center"
              >
                <motion.span
                  animate={
                    reduceMotion
                      ? undefined
                      : { y: [0, -4, 0], opacity: [0.55, 1, 0.55] }
                  }
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                  className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-card text-muted-foreground shadow-[var(--shadow-card)]"
                >
                  <Check className="h-5 w-5" />
                </motion.span>
                <p className="text-sm text-muted-foreground">
                  {t("workTable.selectHint")}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
