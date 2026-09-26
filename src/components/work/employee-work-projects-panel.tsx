"use client";

import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { FolderKanban } from "lucide-react";
import { LtrNum } from "@/components/shared/ltr-num";
import { statusLabelKey } from "@/components/work/employee-work-hub-types";
import { TaskViewSheet } from "@/components/work/task-view-sheet";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "@/hooks/use-translation";
import type { TranslationPath } from "@/i18n";
import { summarizePhases } from "@/lib/work-project";
import { getWorkProjects } from "@/services/work.service";
import { WORK_UPDATED_EVENT } from "@/lib/events";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types";
import type { WorkTask } from "@/types/work";
import type { ProjectPhaseStatus, ProjectStatus, WorkProject, WorkProjectPhase, WorkProjectTask } from "@/types/work-project";

const PROJECT_STATUS: Record<ProjectStatus, TranslationPath> = {
  planning: "workAdmin.projects.statusPlanning",
  active: "workAdmin.projects.statusActive",
  on_hold: "workAdmin.projects.statusOnHold",
  completed: "workAdmin.projects.statusCompleted",
};

const PHASE_STATUS: Record<ProjectPhaseStatus, TranslationPath> = {
  upcoming: "workAdmin.projects.phaseUpcoming",
  active: "workAdmin.projects.phaseActive",
  done: "workAdmin.projects.phaseDone",
};

function formatDay(value: string, locale: typeof arLocale) {
  if (!value) return "";
  try {
    return format(parseISO(value), "d MMM yyyy", { locale });
  } catch {
    return value;
  }
}

function ownsTask(task: { assigneeIds: string[] }, employeeId: string) {
  return Boolean(employeeId) && task.assigneeIds.includes(employeeId);
}

function livePhaseTasks(
  phase: WorkProjectPhase,
  projectId: string,
  workTasks: WorkTask[]
) {
  return workTasks.filter(
    (task) => task.projectId === projectId && task.phaseId === phase.id
  );
}

function draftPhaseTasks(
  phase: WorkProjectPhase,
  live: WorkTask[]
) {
  const ids = new Set(live.map((task) => task.id));
  const titles = new Set(live.map((task) => task.title.trim()));
  return phase.tasks.filter((task) => {
    if (!task.title.trim()) return false;
    if (task.workTaskId && ids.has(task.workTaskId)) return false;
    return !titles.has(task.title.trim());
  });
}

/** Read-only projects for people on the team or assigned a task inside it. */
export function EmployeeWorkProjectsPanel({
  employeeId,
  employees,
  workTasks = [],
}: {
  employeeId: string;
  employees: Employee[];
  workTasks?: WorkTask[];
}) {
  const { t, locale } = useTranslation();
  const dateLocale = locale === "ar" ? arLocale : enUS;
  const [projects, setProjects] = useState<WorkProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<WorkTask | null>(null);
  const names = useMemo(
    () => new Map(employees.map((employee) => [employee.id, employee.name])),
    [employees]
  );

  useEffect(() => {
    let mounted = true;
    async function load() {
      const res = await getWorkProjects();
      if (!mounted) return;
      if (res.success) setProjects(res.data);
      setLoading(false);
    }
    void load();
    const onUpdate = () => {
      void load();
    };
    window.addEventListener(WORK_UPDATED_EVENT, onUpdate);
    return () => {
      mounted = false;
      window.removeEventListener(WORK_UPDATED_EVENT, onUpdate);
    };
  }, []);

  const selected = projects.find((project) => project.id === openId) ?? null;

  if (loading) {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <div className="h-36 animate-pulse rounded-2xl bg-muted" />
        <div className="h-36 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center">
        <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <FolderKanban className="h-5 w-5" />
        </span>
        <p className="font-display text-lg font-semibold">
          {t("workHub.projectsEmptyTitle")}
        </p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {t("workHub.projectsEmptyHint")}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        {projects.map((project) => {
          const summary = summarizePhases(project.phases);
          const mine = project.phases.reduce(
            (count, phase) =>
              count + phase.tasks.filter((task) => ownsTask(task, employeeId)).length,
            0
          );
          const lead = names.get(project.leadId);
          return (
            <button
              key={project.id}
              type="button"
              onClick={() => setOpenId(project.id)}
              className="rounded-2xl border border-border/70 bg-card p-4 text-start shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-primary/25"
            >
              <div className="flex items-center justify-between gap-3">
                <Badge variant={project.status === "completed" ? "success" : "default"}>
                  {t(PROJECT_STATUS[project.status])}
                </Badge>
                {mine > 0 ? (
                  <span className="text-[12px] font-semibold text-primary">
                    {t("workHub.projectsMineCount", { count: mine })}
                  </span>
                ) : null}
              </div>
              <h3 className="font-display mt-3 text-[1.05rem] font-semibold tracking-tight">
                {project.name}
              </h3>
              {lead ? (
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {t("workHub.projectsLead")}: {lead}
                </p>
              ) : null}
              <p className="mt-2 text-[12px] text-muted-foreground">
                {t("workAdmin.projects.meta", {
                  phases: summary.phases,
                  tasks: summary.tasks,
                })}
              </p>
            </button>
          );
        })}
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setOpenId(null)}>
        <DialogContent className="flex max-h-[min(94dvh,880px)] w-full max-w-none flex-col gap-0 overflow-hidden p-0 sm:w-[min(92vw,42rem)] sm:max-w-[min(92vw,42rem)]">
          {selected ? (
            <ProjectReadView
              project={selected}
              employeeId={employeeId}
              names={names}
              dateLocale={dateLocale}
              workTasks={workTasks}
              onOpenTask={setViewing}
            />
          ) : null}
        </DialogContent>
      </Dialog>
      <TaskViewSheet
        task={viewing}
        open={Boolean(viewing)}
        onOpenChange={(open) => {
          if (!open) setViewing(null);
        }}
        employees={new Map(employees.map((employee) => [employee.id, employee]))}
      />
    </>
  );
}

function ProjectReadView({
  project,
  employeeId,
  names,
  dateLocale,
  workTasks,
  onOpenTask,
}: {
  project: WorkProject;
  employeeId: string;
  names: Map<string, string>;
  dateLocale: typeof arLocale;
  workTasks: WorkTask[];
  onOpenTask: (task: WorkTask) => void;
}) {
  const { t } = useTranslation();
  const mine = project.phases.flatMap((phase) => {
    const live = livePhaseTasks(phase, project.id, workTasks).filter((task) =>
      ownsTask(task, employeeId)
    );
    const drafts = draftPhaseTasks(phase, livePhaseTasks(phase, project.id, workTasks)).filter(
      (task) => ownsTask(task, employeeId)
    );
    return [
      ...live.map((task) => ({
        key: task.id,
        phaseName: phase.name,
        task,
        onOpen: () => onOpenTask(task),
      })),
      ...drafts.map((task) => ({
        key: task.id,
        phaseName: phase.name,
        task,
        onOpen: undefined,
      })),
    ];
  });
  const team = Array.from(new Set([project.leadId, ...project.memberIds])).filter(Boolean);
  const range = [project.startDate, project.endDate].filter(Boolean);

  function person(id: string) {
    return names.get(id) || t("workAdmin.projects.taskUnassigned");
  }

  return (
    <>
      <DialogHeader className="shrink-0 border-b border-border/55 px-4 pb-3.5 pt-1 sm:px-5 sm:pt-5">
        <DialogTitle className="flex items-center gap-2.5">
          <span className="icon-well h-9 w-9 shrink-0">
            <FolderKanban className="h-4 w-4" aria-hidden />
          </span>
          {project.name}
        </DialogTitle>
        <DialogDescription>
          {project.description || t("workHub.projectsOpen")}
        </DialogDescription>
      </DialogHeader>
      <DialogBody className="grid gap-4 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={project.status === "completed" ? "success" : "default"}>
            {t(PROJECT_STATUS[project.status])}
          </Badge>
          {range.length > 0 ? (
            <LtrNum className="text-[12px] text-muted-foreground">
              {range.map((day) => formatDay(day, dateLocale)).join(" – ")}
            </LtrNum>
          ) : null}
        </div>

        <section className="grid gap-2 rounded-2xl border border-border/70 bg-card p-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {t("workHub.projectsTeam")}
          </h3>
          <p className="text-[13px]">
            <span className="text-muted-foreground">{t("workHub.projectsLead")}: </span>
            <span className="font-semibold">{person(project.leadId)}</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {team.map((id) => (
              <span
                key={id}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[12px] font-medium",
                  id === employeeId
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border/70 bg-muted/40"
                )}
              >
                {person(id)}
              </span>
            ))}
          </div>
        </section>

        {mine.length > 0 ? (
          <section className="grid gap-2 rounded-2xl border border-primary/25 bg-primary/[0.04] p-4">
            <h3 className="text-[13px] font-semibold text-primary">
              {t("workHub.projectsYourTasks")}
            </h3>
            <ul className="grid gap-2">
              {mine.map(({ key, phaseName, task, onOpen }) => (
                <li key={key}>
                  <TaskLine
                    task={task}
                    phaseName={phaseName}
                    owner={person(task.assigneeIds[0] ?? "")}
                    mine
                    dateLocale={dateLocale}
                    onOpen={onOpen}
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="grid gap-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {t("workHub.projectsPhases")}
          </h3>
          {project.phases.map((phase) => (
            <article
              key={phase.id}
              className="grid gap-2.5 rounded-2xl border border-border/70 bg-card p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-[15px] font-semibold">{phase.name}</h4>
                <Badge variant="outline">{t(PHASE_STATUS[phase.status])}</Badge>
              </div>
              {phase.startDate || phase.endDate ? (
                <LtrNum className="text-[12px] text-muted-foreground">
                  {[phase.startDate, phase.endDate]
                    .filter(Boolean)
                    .map((day) => formatDay(day, dateLocale))
                    .join(" – ")}
                </LtrNum>
              ) : null}
              {phase.description ? (
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  {phase.description}
                </p>
              ) : null}
              {(() => {
                const live = livePhaseTasks(phase, project.id, workTasks);
                const drafts = draftPhaseTasks(phase, live);
                if (live.length + drafts.length === 0) {
                  return (
                    <p className="text-[12px] text-muted-foreground">
                      {t("workHub.projectsNoTasks")}
                    </p>
                  );
                }
                return (
                  <ul className="grid gap-2">
                    {live.map((task) => (
                      <li key={task.id}>
                        <TaskLine
                          task={task}
                          owner={
                            task.assigneeIds[0]
                              ? person(task.assigneeIds[0])
                              : t("workAdmin.projects.taskUnassigned")
                          }
                          mine={ownsTask(task, employeeId)}
                          dateLocale={dateLocale}
                          onOpen={() => onOpenTask(task)}
                        />
                      </li>
                    ))}
                    {drafts.map((task) => (
                      <li key={task.id}>
                        <TaskLine
                          task={task}
                          owner={
                            task.assigneeIds[0]
                              ? person(task.assigneeIds[0])
                              : t("workAdmin.projects.taskUnassigned")
                          }
                          mine={ownsTask(task, employeeId)}
                          dateLocale={dateLocale}
                        />
                      </li>
                    ))}
                  </ul>
                );
              })()}
            </article>
          ))}
        </section>
      </DialogBody>
    </>
  );
}

function TaskLine({
  task,
  owner,
  mine,
  phaseName,
  dateLocale,
  onOpen,
}: {
  task: Pick<WorkProjectTask, "title" | "status" | "assigneeIds" | "dueDate">;
  owner: string;
  mine: boolean;
  phaseName?: string;
  dateLocale: typeof arLocale;
  onOpen?: () => void;
}) {
  const { t } = useTranslation();
  const className = cn(
    "w-full rounded-xl border px-3 py-2.5 text-start",
    mine ? "border-primary/35 bg-background" : "border-border/60"
  );
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-semibold leading-snug">{task.title}</p>
        <Badge variant={task.status === "completed" ? "success" : "outline"}>
          {t(statusLabelKey(task.status))}
        </Badge>
      </div>
      <p className="mt-1 text-[12px] text-muted-foreground">
        {mine ? t("workHub.projectsYourTask") : owner}
        {phaseName ? ` · ${phaseName}` : ""}
        {task.dueDate ? (
          <>
            {" · "}
            <LtrNum>{formatDay(task.dueDate, dateLocale)}</LtrNum>
          </>
        ) : null}
      </p>
    </>
  );
  if (onOpen) {
    return (
      <button type="button" className={className} onClick={onOpen}>
        {body}
      </button>
    );
  }
  return <div className={className}>{body}</div>;
}
