"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { CheckCircle2, FileText, FolderKanban } from "lucide-react";
import { ProjectAnnexReadout } from "@/components/work/project-annex-readout";
import { LtrNum } from "@/components/shared/ltr-num";
import { statusLabelKey } from "@/components/work/employee-work-hub-types";
import { TaskViewSheet } from "@/components/work/task-view-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { projectHasTechnicalAnnex, summarizePhases } from "@/lib/work-project";
import { getWorkProjects, getWorkTasks } from "@/services/work.service";
import { WORK_UPDATED_EVENT } from "@/lib/events";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types";
import type { WorkTask } from "@/types/work";
import type {
  ProjectPhaseStatus,
  ProjectStatus,
  WorkProject,
  WorkProjectPhase,
  WorkProjectTask,
} from "@/types/work-project";

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

type PhaseRow = {
  key: string;
  plan: WorkProjectTask | null;
  live: WorkTask | null;
  title: string;
  status: WorkTask["status"];
  assigneeIds: string[];
  dueDate: string;
  epicName: string;
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

function isProjectMember(project: WorkProject, employeeId: string) {
  if (!employeeId) return false;
  return (
    project.leadId === employeeId || project.memberIds.includes(employeeId)
  );
}

/** Engineer may progress: assigned to them, or unassigned on a project they belong to. */
function canActOnTask(
  task: WorkTask,
  employeeId: string,
  project: WorkProject
): boolean {
  if (!employeeId) return false;
  if (ownsTask(task, employeeId)) return true;
  return (
    task.assigneeIds.length === 0 && isProjectMember(project, employeeId)
  );
}

function resolvePhaseRows(
  phase: WorkProjectPhase,
  projectId: string,
  workTasks: WorkTask[]
): PhaseRow[] {
  const byId = new Map(workTasks.map((task) => [task.id, task]));
  const linked = workTasks.filter(
    (task) => task.projectId === projectId && task.phaseId === phase.id
  );
  const used = new Set<string>();
  const rows: PhaseRow[] = [];

  for (const plan of phase.tasks) {
    if (!plan.title.trim()) continue;
    const live =
      (plan.workTaskId ? byId.get(plan.workTaskId) : undefined) ??
      linked.find((task) => task.title.trim() === plan.title.trim()) ??
      null;
    if (live) used.add(live.id);
    rows.push({
      key: live?.id ?? plan.id,
      plan,
      live,
      title: live?.title ?? plan.title,
      status: live?.status ?? plan.status,
      assigneeIds: live?.assigneeIds?.length
        ? live.assigneeIds
        : plan.assigneeIds,
      dueDate: live?.dueDate || plan.dueDate || "",
      epicName: plan.epicName?.trim() || plan.epicKey?.trim() || "",
    });
  }

  for (const live of linked) {
    if (used.has(live.id)) continue;
    rows.push({
      key: live.id,
      plan: null,
      live,
      title: live.title,
      status: live.status,
      assigneeIds: live.assigneeIds,
      dueDate: live.dueDate || "",
      epicName: "",
    });
  }

  return rows;
}

function groupRowsByEpic(rows: PhaseRow[]) {
  const groups = new Map<string, PhaseRow[]>();
  for (const row of rows) {
    const epic = row.epicName || "";
    const list = groups.get(epic) ?? [];
    list.push(row);
    groups.set(epic, list);
  }
  return Array.from(groups.entries());
}

/** Read-only projects for people on the team or assigned a task inside it. */
export function EmployeeWorkProjectsPanel({
  employeeId,
  employees,
  workTasks = [],
  onMarkDone,
  onCycleStatus,
}: {
  employeeId: string;
  employees: Employee[];
  workTasks?: WorkTask[];
  onMarkDone?: (task: WorkTask) => void;
  onCycleStatus?: (task: WorkTask) => void;
}) {
  const { t, locale } = useTranslation();
  const dateLocale = locale === "ar" ? arLocale : enUS;
  const [projects, setProjects] = useState<WorkProject[]>([]);
  const [projectTasks, setProjectTasks] = useState<WorkTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<WorkTask | null>(null);
  const names = useMemo(
    () => new Map(employees.map((employee) => [employee.id, employee.name])),
    [employees]
  );

  const loadProjects = useCallback(async () => {
    const res = await getWorkProjects();
    if (res.success) setProjects(res.data);
  }, []);

  const loadProjectTasks = useCallback(async () => {
    // Visible project-member tasks (not only assignee-scoped "mine").
    const res = await getWorkTasks({ team: true });
    if (res.success) setProjectTasks(res.data ?? []);
  }, []);

  useEffect(() => {
    let mounted = true;
    async function load() {
      await Promise.all([loadProjects(), loadProjectTasks()]);
      if (mounted) setLoading(false);
    }
    void load();
    const onUpdate = () => {
      void loadProjects();
      void loadProjectTasks();
    };
    window.addEventListener(WORK_UPDATED_EVENT, onUpdate);
    return () => {
      mounted = false;
      window.removeEventListener(WORK_UPDATED_EVENT, onUpdate);
    };
  }, [loadProjects, loadProjectTasks]);

  const allTasks = useMemo(() => {
    const map = new Map<string, WorkTask>();
    for (const task of workTasks) map.set(task.id, task);
    for (const task of projectTasks) map.set(task.id, task);
    return Array.from(map.values());
  }, [projectTasks, workTasks]);

  useEffect(() => {
    if (!viewing) return;
    const fresh = allTasks.find((task) => task.id === viewing.id);
    if (fresh && fresh !== viewing) setViewing(fresh);
  }, [allTasks, viewing]);

  const selected = projects.find((project) => project.id === openId) ?? null;

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div className="h-36 animate-pulse rounded-2xl bg-muted" />
        <div className="h-36 animate-pulse rounded-2xl bg-muted" />
        <div className="hidden h-36 animate-pulse rounded-2xl bg-muted xl:block" />
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
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => {
          const summary = summarizePhases(project.phases);
          const rows = project.phases.flatMap((phase) =>
            resolvePhaseRows(phase, project.id, allTasks)
          );
          const mine = rows.filter((row) =>
            ownsTask({ assigneeIds: row.assigneeIds }, employeeId)
          ).length;
          const lead = names.get(project.leadId);
          return (
            <button
              key={project.id}
              type="button"
              onClick={() => setOpenId(project.id)}
              className="min-w-0 touch-manipulation rounded-2xl border border-border/70 bg-card p-3.5 text-start shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-primary/25 active:scale-[0.99] sm:p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <Badge variant={project.status === "completed" ? "success" : "default"}>
                    {t(PROJECT_STATUS[project.status])}
                  </Badge>
                  {projectHasTechnicalAnnex(project) ? (
                    <Badge variant="outline" className="gap-1">
                      <FileText className="h-3 w-3" aria-hidden />
                      {t("workAdmin.projects.annexBadge")}
                    </Badge>
                  ) : null}
                </div>
                {mine > 0 ? (
                  <span className="shrink-0 text-[12px] font-semibold text-primary">
                    {t("workHub.projectsMineCount", { count: mine })}
                  </span>
                ) : null}
              </div>
              <h3 className="font-display mt-3 break-words text-[1.05rem] font-semibold tracking-tight">
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
                  tasks: Math.max(summary.tasks, rows.length),
                })}
              </p>
            </button>
          );
        })}
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setOpenId(null)}>
        <DialogContent className="flex max-h-[min(96dvh,100%)] w-full max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-h-[min(94dvh,920px)] sm:w-[min(96vw,56rem)] sm:max-w-[min(96vw,56rem)] sm:p-0 lg:w-[min(94vw,64rem)] lg:max-w-[min(94vw,64rem)]">
          {selected ? (
            <ProjectReadView
              project={selected}
              employeeId={employeeId}
              names={names}
              dateLocale={dateLocale}
              workTasks={allTasks}
              onOpenTask={setViewing}
              onMarkDone={onMarkDone}
              onCycleStatus={onCycleStatus}
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
        onCycleStatus={
          viewing && selected && canActOnTask(viewing, employeeId, selected)
            ? (task) => {
                if (task.status === "in_progress") {
                  onMarkDone?.(task);
                  return;
                }
                onCycleStatus?.(task);
              }
            : undefined
        }
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
  onMarkDone,
  onCycleStatus,
}: {
  project: WorkProject;
  employeeId: string;
  names: Map<string, string>;
  dateLocale: typeof arLocale;
  workTasks: WorkTask[];
  onOpenTask: (task: WorkTask) => void;
  onMarkDone?: (task: WorkTask) => void;
  onCycleStatus?: (task: WorkTask) => void;
}) {
  const { t } = useTranslation();
  const mineRows = project.phases.flatMap((phase) =>
    resolvePhaseRows(phase, project.id, workTasks)
      .filter((row) => ownsTask({ assigneeIds: row.assigneeIds }, employeeId))
      .map((row) => ({ ...row, phaseName: phase.name }))
  );
  const team = Array.from(new Set([project.leadId, ...project.memberIds])).filter(Boolean);
  const range = [project.startDate, project.endDate].filter(Boolean);

  function person(id: string) {
    return names.get(id) || t("workAdmin.projects.taskUnassigned");
  }

  function ownerLabel(assigneeIds: string[]) {
    if (!assigneeIds[0]) return t("workAdmin.projects.taskUnassigned");
    return person(assigneeIds[0]);
  }

  return (
    <>
      <DialogHeader className="shrink-0 border-b border-border/55 px-3.5 pb-3 pt-1 sm:px-5 sm:pb-3.5 sm:pt-5">
        <DialogTitle className="flex min-w-0 items-center gap-2.5">
          <span className="icon-well h-9 w-9 shrink-0">
            <FolderKanban className="h-4 w-4" aria-hidden />
          </span>
          <span className="min-w-0 break-words">{project.name}</span>
        </DialogTitle>
        <DialogDescription className="line-clamp-3 sm:line-clamp-2">
          {project.description || t("workHub.projectsOpen")}
        </DialogDescription>
      </DialogHeader>
      <DialogBody className="grid gap-3.5 px-3.5 py-3.5 pb-[max(1rem,env(safe-area-inset-bottom))] sm:gap-4 sm:px-5 sm:py-4 sm:pb-4">
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

        <ProjectAnnexReadout project={project} />

        <section className="grid gap-2 rounded-2xl border border-border/70 bg-card p-3.5 sm:p-4">
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

        {mineRows.length > 0 ? (
          <section className="grid gap-2 rounded-2xl border border-primary/25 bg-primary/[0.04] p-3.5 sm:p-4">
            <h3 className="text-[13px] font-semibold text-primary">
              {t("workHub.projectsYourTasks")}
            </h3>
            <ul className="grid gap-2">
              {mineRows.map((row) => (
                <li key={`mine:${row.key}`} className="min-w-0">
                  <TaskLine
                    row={row}
                    phaseName={row.phaseName}
                    owner={ownerLabel(row.assigneeIds)}
                    mine
                    dateLocale={dateLocale}
                    canAct={Boolean(row.live && canActOnTask(row.live, employeeId, project))}
                    onOpen={row.live ? () => onOpenTask(row.live!) : undefined}
                    onMarkDone={
                      row.live && canActOnTask(row.live, employeeId, project)
                        ? () => onMarkDone?.(row.live!)
                        : undefined
                    }
                    onStart={
                      row.live &&
                      row.live.status === "todo" &&
                      canActOnTask(row.live, employeeId, project)
                        ? () => onCycleStatus?.(row.live!)
                        : undefined
                    }
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
          {project.phases.map((phase) => {
            const rows = resolvePhaseRows(phase, project.id, workTasks);
            return (
              <article
                key={phase.id}
                className="grid min-w-0 gap-2.5 rounded-2xl border border-border/70 bg-card p-3.5 sm:p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <h4 className="min-w-0 break-words text-[15px] font-semibold">
                    {phase.name}
                  </h4>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{t(PHASE_STATUS[phase.status])}</Badge>
                    <span className="text-[12px] text-muted-foreground">
                      {t("workHub.projectsPhaseTaskCount", { count: rows.length })}
                    </span>
                  </div>
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
                  <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-muted-foreground">
                    {phase.description}
                  </p>
                ) : null}
                {rows.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground">
                    {t("workHub.projectsNoTasks")}
                  </p>
                ) : (
                  <div className="grid gap-3">
                    {groupRowsByEpic(rows).map(([epicName, epicRows]) => (
                      <div key={`${phase.id}:${epicName || "general"}`} className="grid gap-2">
                        {epicName ? (
                          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                            {epicName}
                            <span className="ms-2 font-medium normal-case tracking-normal">
                              {t("workHub.projectsEpicTaskCount", {
                                count: epicRows.length,
                              })}
                            </span>
                          </p>
                        ) : null}
                        <ul className="grid gap-2">
                          {epicRows.map((row) => (
                            <li key={row.key} className="min-w-0">
                              <TaskLine
                                row={row}
                                owner={ownerLabel(row.assigneeIds)}
                                mine={ownsTask(
                                  { assigneeIds: row.assigneeIds },
                                  employeeId
                                )}
                                dateLocale={dateLocale}
                                canAct={Boolean(
                                  row.live &&
                                    canActOnTask(row.live, employeeId, project)
                                )}
                                onOpen={
                                  row.live ? () => onOpenTask(row.live!) : undefined
                                }
                                onMarkDone={
                                  row.live &&
                                  canActOnTask(row.live, employeeId, project)
                                    ? () => onMarkDone?.(row.live!)
                                    : undefined
                                }
                                onStart={
                                  row.live &&
                                  row.live.status === "todo" &&
                                  canActOnTask(row.live, employeeId, project)
                                    ? () => onCycleStatus?.(row.live!)
                                    : undefined
                                }
                              />
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </section>
      </DialogBody>
    </>
  );
}

function TaskLine({
  row,
  owner,
  mine,
  phaseName,
  dateLocale,
  canAct,
  onOpen,
  onMarkDone,
  onStart,
}: {
  row: PhaseRow;
  owner: string;
  mine: boolean;
  phaseName?: string;
  dateLocale: typeof arLocale;
  canAct?: boolean;
  onOpen?: () => void;
  onMarkDone?: () => void;
  onStart?: () => void;
}) {
  const { t } = useTranslation();
  const done = row.status === "completed";
  const className = cn(
    "w-full min-w-0 rounded-xl border px-3 py-2.5 text-start",
    mine ? "border-primary/35 bg-background" : "border-border/60",
    done && "opacity-80"
  );
  const meta = (
    <p className="mt-1 break-words text-[12px] text-muted-foreground">
      {mine ? t("workHub.projectsYourTask") : owner}
      {phaseName ? ` · ${phaseName}` : ""}
      {row.dueDate ? (
        <>
          {" · "}
          <LtrNum>{formatDay(row.dueDate, dateLocale)}</LtrNum>
        </>
      ) : null}
    </p>
  );

  return (
    <div className={cn(className, "flex flex-col gap-2.5 sm:flex-row sm:items-stretch sm:gap-2")}>
      <div className="min-w-0 flex-1">
        {onOpen ? (
          <button
            type="button"
            className="w-full touch-manipulation text-start"
            onClick={onOpen}
          >
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
              <p className="min-w-0 flex-1 break-words text-[13px] font-semibold leading-snug">
                {row.title}
              </p>
              <Badge
                variant={done ? "success" : "outline"}
                className="w-fit shrink-0"
              >
                {t(statusLabelKey(row.status))}
              </Badge>
            </div>
            {meta}
          </button>
        ) : (
          <>
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
              <p className="min-w-0 flex-1 break-words text-[13px] font-semibold leading-snug">
                {row.title}
              </p>
              <Badge
                variant={done ? "success" : "outline"}
                className="w-fit shrink-0"
              >
                {t(statusLabelKey(row.status))}
              </Badge>
            </div>
            {meta}
          </>
        )}
      </div>
      {canAct && !done ? (
        <div className="flex shrink-0 flex-col gap-1.5 sm:justify-center">
          {onStart ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-10 w-full touch-manipulation rounded-xl sm:h-9 sm:min-w-[7.5rem]"
              onClick={(event) => {
                event.stopPropagation();
                onStart();
              }}
            >
              {t("workEvidence.startWork")}
            </Button>
          ) : null}
          {onMarkDone ? (
            <Button
              type="button"
              size="sm"
              variant={row.status === "in_progress" ? "default" : "outline"}
              className="h-10 w-full touch-manipulation rounded-xl sm:h-9 sm:min-w-[7.5rem]"
              onClick={(event) => {
                event.stopPropagation();
                onMarkDone();
              }}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t("workEvidence.done")}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
