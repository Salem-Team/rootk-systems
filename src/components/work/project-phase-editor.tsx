"use client";

import { useState } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/hooks/use-translation";
import { emptyProjectTask } from "@/lib/work-project";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types";
import type { TaskPriority, TaskStatus } from "@/types/work";
import type {
  ProjectPhaseStatus,
  WorkProjectPhase,
  WorkProjectTask,
} from "@/types/work-project";

const selectClass = cn(
  "h-10 w-full rounded-xl border border-border/80 bg-card px-3 text-sm text-foreground",
  "hover:border-border focus-visible:border-primary/45 focus-visible:outline-none",
  "focus-visible:ring-[3px] focus-visible:ring-ring/18"
);

function taskNeedsDetails(task: WorkProjectTask) {
  return (
    Boolean(task.dueDate) ||
    task.estimateMin > 0 ||
    task.status !== "todo" ||
    task.priority !== "medium"
  );
}

export function ProjectPhaseEditor({
  phases,
  members,
  onChange,
}: {
  phases: WorkProjectPhase[];
  members: Employee[];
  onChange: (phases: WorkProjectPhase[]) => void;
}) {
  const { t } = useTranslation();
  const [openNotes, setOpenNotes] = useState<Record<string, boolean>>({});
  const [openDetails, setOpenDetails] = useState<Record<string, boolean>>({});

  function patchPhase(id: string, patch: Partial<WorkProjectPhase>) {
    onChange(
      phases.map((phase) => (phase.id === id ? { ...phase, ...patch } : phase))
    );
  }

  function patchTask(
    phase: WorkProjectPhase,
    taskId: string,
    patch: Partial<WorkProjectTask>
  ) {
    patchPhase(phase.id, {
      tasks: phase.tasks.map((task) =>
        task.id === taskId ? { ...task, ...patch } : task
      ),
    });
  }

  return (
    <ol className="space-y-3">
      {phases.map((phase, index) => {
        const notesVisible =
          openNotes[phase.id] ?? Boolean(phase.description.trim());
        return (
          <li
            key={phase.id}
            className="rounded-2xl border border-border/70 bg-card p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-4"
          >
            <div className="flex items-start gap-2">
              <span className="mt-2 w-6 shrink-0 font-mono text-[11px] font-semibold text-primary">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1 space-y-2">
                <Input
                  value={phase.name}
                  onChange={(event) =>
                    patchPhase(phase.id, { name: event.target.value })
                  }
                  placeholder={t("workAdmin.projects.phaseName")}
                  className="h-10 rounded-xl"
                />
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_8.5rem]">
                  <Input
                    type="date"
                    value={phase.startDate}
                    aria-label={t("workAdmin.projects.fieldStart")}
                    onChange={(event) =>
                      patchPhase(phase.id, { startDate: event.target.value })
                    }
                    className="h-10 rounded-xl"
                  />
                  <Input
                    type="date"
                    value={phase.endDate}
                    aria-label={t("workAdmin.projects.fieldEnd")}
                    onChange={(event) =>
                      patchPhase(phase.id, { endDate: event.target.value })
                    }
                    className="h-10 rounded-xl"
                  />
                  <select
                    className={cn(selectClass, "col-span-2 sm:col-span-1")}
                    value={phase.status}
                    aria-label={t("workAdmin.projects.fieldStatus")}
                    onChange={(event) =>
                      patchPhase(phase.id, {
                        status: event.target.value as ProjectPhaseStatus,
                      })
                    }
                  >
                    <option value="upcoming">
                      {t("workAdmin.projects.phaseUpcoming")}
                    </option>
                    <option value="active">
                      {t("workAdmin.projects.phaseActive")}
                    </option>
                    <option value="done">
                      {t("workAdmin.projects.phaseDone")}
                    </option>
                  </select>
                </div>
                {notesVisible ? (
                  <Textarea
                    value={phase.description}
                    onChange={(event) =>
                      patchPhase(phase.id, { description: event.target.value })
                    }
                    placeholder={t("workAdmin.projects.phaseNotes")}
                    className="min-h-[68px] rounded-xl"
                  />
                ) : (
                  <button
                    type="button"
                    className="text-[12px] font-medium text-muted-foreground hover:text-foreground"
                    onClick={() =>
                      setOpenNotes((current) => ({ ...current, [phase.id]: true }))
                    }
                  >
                    {t("workAdmin.projects.addNote")}
                  </button>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0 rounded-xl text-muted-foreground"
                aria-label={t("workAdmin.projects.removePhase")}
                onClick={() =>
                  onChange(phases.filter((item) => item.id !== phase.id))
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <ul className="mt-3 space-y-2 ps-8">
              {phase.tasks.map((task) => {
                const detailsOpen =
                  openDetails[task.id] ?? taskNeedsDetails(task);
                return (
                  <li
                    key={task.id}
                    className="rounded-xl border border-border/60 bg-muted/20 p-2"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Input
                        value={task.title}
                        onChange={(event) =>
                          patchTask(phase, task.id, { title: event.target.value })
                        }
                        placeholder={t("workAdmin.projects.taskTitle")}
                        className="h-10 min-w-0 flex-1 rounded-xl bg-card"
                      />
                      <select
                        className={cn(selectClass, "w-full shrink-0 bg-card sm:w-40")}
                        value={task.assigneeIds[0] ?? ""}
                        aria-label={t("workAdmin.projects.taskOwner")}
                        onChange={(event) =>
                          patchTask(phase, task.id, {
                            assigneeIds: event.target.value
                              ? [event.target.value]
                              : [],
                          })
                        }
                      >
                        <option value="">
                          {t("workAdmin.projects.taskUnassigned")}
                        </option>
                        {members.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name}
                          </option>
                        ))}
                      </select>
                      <div className="flex shrink-0 justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 shrink-0 rounded-xl text-muted-foreground"
                        aria-expanded={detailsOpen}
                        aria-label={
                          detailsOpen
                            ? t("workAdmin.projects.hideDetails")
                            : t("workAdmin.projects.showDetails")
                        }
                        onClick={() =>
                          setOpenDetails((current) => ({
                            ...current,
                            [task.id]: !detailsOpen,
                          }))
                        }
                      >
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 transition-transform",
                            detailsOpen && "rotate-180"
                          )}
                        />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 shrink-0 rounded-xl text-muted-foreground"
                        aria-label={t("workAdmin.projects.removeTask")}
                        onClick={() =>
                          patchPhase(phase.id, {
                            tasks: phase.tasks.filter((item) => item.id !== task.id),
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      </div>
                    </div>
                    {detailsOpen ? (
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <select
                          className={cn(selectClass, "bg-card")}
                          value={task.status}
                          aria-label={t("workAdmin.projects.fieldStatus")}
                          onChange={(event) =>
                            patchTask(phase, task.id, {
                              status: event.target.value as TaskStatus,
                            })
                          }
                        >
                          <option value="todo">{t("ops.statusTodo")}</option>
                          <option value="in_progress">
                            {t("ops.statusInProgress")}
                          </option>
                          <option value="completed">
                            {t("ops.statusCompleted")}
                          </option>
                        </select>
                        <select
                          className={cn(selectClass, "bg-card")}
                          value={task.priority}
                          aria-label={t("workAdmin.fieldPriority")}
                          onChange={(event) =>
                            patchTask(phase, task.id, {
                              priority: event.target.value as TaskPriority,
                            })
                          }
                        >
                          <option value="low">{t("ops.priority.low")}</option>
                          <option value="medium">{t("ops.priority.medium")}</option>
                          <option value="high">{t("ops.priority.high")}</option>
                        </select>
                        <Input
                          type="number"
                          min={0}
                          value={task.estimateMin || ""}
                          aria-label={t("workAdmin.projects.taskEstimate")}
                          placeholder={t("workAdmin.projects.taskEstimate")}
                          onChange={(event) =>
                            patchTask(phase, task.id, {
                              estimateMin: Number(event.target.value) || 0,
                            })
                          }
                          className="h-10 rounded-xl bg-card"
                        />
                        <Input
                          type="date"
                          value={task.dueDate}
                          aria-label={t("workAdmin.projects.taskDue")}
                          onChange={(event) =>
                            patchTask(phase, task.id, { dueDate: event.target.value })
                          }
                          className="h-10 rounded-xl bg-card"
                        />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2 h-9 rounded-xl ps-8 text-muted-foreground"
              onClick={() =>
                patchPhase(phase.id, {
                  tasks: [...phase.tasks, emptyProjectTask()],
                })
              }
            >
              <Plus className="h-3.5 w-3.5" />
              {t("workAdmin.projects.addTask")}
            </Button>
          </li>
        );
      })}
    </ol>
  );
}
