"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import { statusLabelKey } from "@/components/work/employee-work-hub-types";
import type { Employee } from "@/types";
import type { WorkTask } from "@/types/work";
import type {
  ProjectPhaseStatus,
  WorkProjectPhase,
  WorkProjectTask,
} from "@/types/work-project";

function DateBound({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex h-10 min-w-0 items-center gap-2 rounded-xl border border-input bg-background px-2.5">
      <span className="shrink-0 text-[12px] font-bold text-primary">{label}</span>
      <input
        type="date"
        value={value}
        aria-label={label}
        onChange={(event) => onChange(event.target.value)}
        className="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none"
      />
    </label>
  );
}

function phaseTasks(phase: WorkProjectPhase, projectId: string | null, workTasks: WorkTask[]) {
  if (!projectId) return [];
  return workTasks.filter(
    (task) => task.projectId === projectId && task.phaseId === phase.id
  );
}

function draftTasks(phase: WorkProjectPhase, projectId: string | null, workTasks: WorkTask[]) {
  const linked = phaseTasks(phase, projectId, workTasks);
  const ids = new Set(linked.map((task) => task.id));
  const titles = new Set(linked.map((task) => task.title.trim()));
  return phase.tasks.filter((task) => {
    if (!task.title.trim()) return false;
    if (task.workTaskId && ids.has(task.workTaskId)) return false;
    return !titles.has(task.title.trim());
  });
}

const selectClass = cn(
  "h-10 w-full rounded-xl border border-border/80 bg-card px-3 text-sm text-foreground",
  "hover:border-border focus-visible:border-primary/45 focus-visible:outline-none",
  "focus-visible:ring-[3px] focus-visible:ring-ring/18"
);

export function ProjectPhaseEditor({
  phases,
  members,
  projectId,
  workTasks,
  onChange,
  onAddTask,
  onOpenTask,
  onEditTask,
  onDeleteTask,
}: {
  phases: WorkProjectPhase[];
  members: Employee[];
  projectId: string | null;
  workTasks: WorkTask[];
  onChange: (phases: WorkProjectPhase[]) => void;
  onAddTask: (phaseId: string, draft?: WorkProjectTask) => void;
  onOpenTask: (task: WorkTask) => void;
  onEditTask: (task: WorkTask) => void;
  onDeleteTask: (task: WorkTask) => void;
}) {
  const { t } = useTranslation();
  const [openNotes, setOpenNotes] = useState<Record<string, boolean>>({});
  const names = new Map(members.map((member) => [member.id, member.name]));

  function patchPhase(id: string, patch: Partial<WorkProjectPhase>) {
    onChange(
      phases.map((phase) => (phase.id === id ? { ...phase, ...patch } : phase))
    );
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
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_8.5rem]">
                  <DateBound
                    label={t("workAdmin.projects.fieldStart")}
                    value={phase.startDate}
                    onChange={(startDate) => patchPhase(phase.id, { startDate })}
                  />
                  <DateBound
                    label={t("workAdmin.projects.fieldEnd")}
                    value={phase.endDate}
                    onChange={(endDate) => patchPhase(phase.id, { endDate })}
                  />
                  <select
                    className={selectClass}
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
              {phaseTasks(phase, projectId, workTasks).map((task) => {
                const owner = task.assigneeIds
                  .map((id) => names.get(id))
                  .filter(Boolean)
                  .join("، ");
                return (
                  <li key={task.id}>
                    <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-card pe-1">
                      <button
                        type="button"
                        className="min-w-0 flex-1 px-3 py-2.5 text-start"
                        onClick={() => onOpenTask(task)}
                      >
                        <span className="block truncate text-[13px] font-semibold">
                          {task.title}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                          {t(statusLabelKey(task.status))}
                          {owner ? ` · ${owner}` : ""}
                        </span>
                      </button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 rounded-xl text-muted-foreground"
                        aria-label={t("workAdmin.editTask")}
                        onClick={() => onEditTask(task)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 rounded-xl text-muted-foreground"
                        aria-label={t("workAdmin.projects.removeTask")}
                        onClick={() => onDeleteTask(task)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </li>
                );
              })}
              {draftTasks(phase, projectId, workTasks).map((task) => (
                <li key={task.id}>
                  <button
                    type="button"
                    className="w-full rounded-xl border border-dashed border-border/80 px-3 py-2.5 text-start"
                    onClick={() => onAddTask(phase.id, task)}
                  >
                    <span className="block truncate text-[13px] font-semibold">
                      {task.title}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {t("workAdmin.projects.taskSystemHint")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2 h-9 rounded-xl ps-8 text-muted-foreground"
              onClick={() => onAddTask(phase.id)}
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
