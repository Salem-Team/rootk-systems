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
    <label className="flex h-11 min-w-0 w-full items-center gap-2 overflow-hidden rounded-xl border border-input bg-background px-2.5 sm:h-10">
      <span className="shrink-0 text-[12px] font-bold text-primary">{label}</span>
      <input
        type="date"
        value={value}
        aria-label={label}
        onChange={(event) => onChange(event.target.value)}
        className="h-full w-0 min-w-0 flex-1 bg-transparent text-base text-foreground outline-none sm:text-sm"
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

function phasePlanByWorkTaskId(phase: WorkProjectPhase) {
  const map = new Map<string, WorkProjectTask>();
  for (const task of phase.tasks) {
    if (task.workTaskId) map.set(task.workTaskId, task);
  }
  return map;
}

function groupLinkedByEpic(
  linked: WorkTask[],
  planById: Map<string, WorkProjectTask>
) {
  const groups = new Map<string, WorkTask[]>();
  for (const task of linked) {
    const plan = planById.get(task.id);
    const epic = plan?.epicName?.trim() || plan?.epicKey?.trim() || "General";
    const list = groups.get(epic) ?? [];
    list.push(task);
    groups.set(epic, list);
  }
  return Array.from(groups.entries());
}

const selectClass = cn(
  "h-11 w-full min-w-0 rounded-xl border border-border/80 bg-card px-3 text-base text-foreground sm:h-10 sm:text-sm",
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
            className="min-w-0 rounded-2xl border border-border/70 bg-card p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-4"
          >
            <div className="flex items-start gap-2">
              <span className="mt-2.5 w-5 shrink-0 font-mono text-[11px] font-semibold text-primary sm:mt-2 sm:w-6">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-start gap-1.5">
                  <Input
                    value={phase.name}
                    onChange={(event) =>
                      patchPhase(phase.id, { name: event.target.value })
                    }
                    placeholder={t("workAdmin.projects.phaseName")}
                    className="h-11 min-w-0 flex-1 rounded-xl text-base sm:h-10 sm:text-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 shrink-0 touch-manipulation rounded-xl text-muted-foreground sm:h-10 sm:w-10"
                    aria-label={t("workAdmin.projects.removePhase")}
                    onClick={() =>
                      onChange(phases.filter((item) => item.id !== phase.id))
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_8.5rem]">
                  <div className="grid min-w-0 grid-cols-2 gap-2 sm:contents">
                    <DateBound
                      label={t("workAdmin.projects.fieldStart")}
                      value={phase.startDate}
                      onChange={(startDate) =>
                        patchPhase(phase.id, { startDate })
                      }
                    />
                    <DateBound
                      label={t("workAdmin.projects.fieldEnd")}
                      value={phase.endDate}
                      onChange={(endDate) => patchPhase(phase.id, { endDate })}
                    />
                  </div>
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
                    className="min-h-[68px] rounded-xl text-base sm:text-sm"
                  />
                ) : (
                  <button
                    type="button"
                    className="touch-manipulation text-[12px] font-medium text-muted-foreground hover:text-foreground"
                    onClick={() =>
                      setOpenNotes((current) => ({
                        ...current,
                        [phase.id]: true,
                      }))
                    }
                  >
                    {t("workAdmin.projects.addNote")}
                  </button>
                )}
              </div>
            </div>

            <ul className="mt-3 space-y-3 ps-0 sm:ps-8">
              {groupLinkedByEpic(
                phaseTasks(phase, projectId, workTasks),
                phasePlanByWorkTaskId(phase)
              ).map(([epicName, epicTasks]) => {
                const planById = phasePlanByWorkTaskId(phase);
                return (
                  <li key={`${phase.id}:${epicName}`} className="min-w-0 space-y-2">
                    <p className="truncate text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      {epicName}
                      <span className="ms-2 font-medium normal-case tracking-normal">
                        {epicTasks.length} tasks
                      </span>
                    </p>
                    <ul className="space-y-2">
                      {epicTasks.map((task) => {
                        const owner = task.assigneeIds
                          .map((id) => names.get(id))
                          .filter(Boolean)
                          .join("، ");
                        const plan = planById.get(task.id);
                        const subTotal = task.subItems?.length ?? 0;
                        const subDone =
                          task.subItems?.filter((s) => s.done).length ?? 0;
                        const deps = plan?.deps?.length ?? 0;
                        return (
                          <li key={task.id} className="min-w-0">
                            <div className="flex min-w-0 items-stretch gap-0.5 rounded-xl border border-border/60 bg-card pe-0.5 sm:items-center sm:pe-1">
                              <button
                                type="button"
                                className="min-w-0 flex-1 touch-manipulation px-2.5 py-2.5 text-start sm:px-3"
                                onClick={() => onOpenTask(task)}
                              >
                                <span className="block truncate text-[13px] font-semibold">
                                  {task.title}
                                </span>
                                <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                                  {t(statusLabelKey(task.status))}
                                  {owner ? ` · ${owner}` : " · Unassigned"}
                                  {subTotal > 0
                                    ? ` · ${subDone}/${subTotal} subtasks`
                                    : ""}
                                  {!task.dueDate ? " · No due date" : ""}
                                  {deps > 0 ? ` · ${deps} deps` : ""}
                                </span>
                              </button>
                              <div className="flex shrink-0 flex-col sm:flex-row">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9 touch-manipulation rounded-xl text-muted-foreground"
                                  aria-label={t("workAdmin.editTask")}
                                  onClick={() => onEditTask(task)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9 touch-manipulation rounded-xl text-muted-foreground"
                                  aria-label={t("workAdmin.projects.removeTask")}
                                  onClick={() => onDeleteTask(task)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                );
              })}
              {draftTasks(phase, projectId, workTasks).map((task) => {
                const subTotal = task.subItems?.length ?? 0;
                return (
                  <li key={task.id} className="min-w-0">
                    <button
                      type="button"
                      className="w-full touch-manipulation rounded-xl border border-dashed border-border/80 px-3 py-2.5 text-start"
                      onClick={() => onAddTask(phase.id, task)}
                    >
                      <span className="block truncate text-[13px] font-semibold">
                        {task.title}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                        {task.epicName ? `${task.epicName} · ` : ""}
                        {subTotal > 0 ? `${subTotal} subtasks · ` : ""}
                        {t("workAdmin.projects.taskSystemHint")}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 ps-0 text-[11px] leading-relaxed text-muted-foreground sm:ps-8">
              {phaseTasks(phase, projectId, workTasks).length +
                draftTasks(phase, projectId, workTasks).length}{" "}
              tasks in this phase ·{" "}
              {phaseTasks(phase, projectId, workTasks).reduce(
                (sum, task) => sum + (task.subItems?.length ?? 0),
                0
              ) +
                draftTasks(phase, projectId, workTasks).reduce(
                  (sum, task) => sum + (task.subItems?.length ?? 0),
                  0
                )}{" "}
              subtasks
            </p>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2 h-10 w-full touch-manipulation justify-start rounded-xl ps-0 text-muted-foreground sm:h-9 sm:w-auto sm:ps-8"
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
