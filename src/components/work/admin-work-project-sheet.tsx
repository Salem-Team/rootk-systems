"use client";

import { useRef, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { FolderKanban, Loader2, Plus } from "lucide-react";
import { AdminWorkDeleteDialog } from "@/components/work/admin-work-delete-dialog";
import { AdminWorkTaskDialog } from "@/components/work/admin-work-task-dialog";
import { EmployeeMultiPicker } from "@/components/work/employee-multi-picker";
import { Field } from "@/components/work/admin-work-field";
import { ProjectPhaseEditor } from "@/components/work/project-phase-editor";
import {
  CopyTextButton,
  DownloadTextButton,
} from "@/components/work/project-text-actions";
import { TaskViewSheet } from "@/components/work/task-view-sheet";
import { useProjectPhaseTasks } from "@/components/work/use-project-phase-tasks";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/hooks/use-translation";
import {
  normalizeProjectForm,
  projectBriefingPlainText,
  summarizePhases,
} from "@/lib/work-project";
import { updateWorkProject } from "@/services/work.service";
import type { TranslationPath } from "@/i18n";
import { emptyProjectPhase } from "@/lib/work-project";
import type { ProjectFormState } from "@/lib/work-project";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types";
import type { WorkMeeting, WorkTask } from "@/types/work";
import type { ProjectStatus } from "@/types/work-project";

const inputClass = "h-11 rounded-xl text-base sm:h-10 sm:text-sm";

const STATUS_KEY: Record<ProjectStatus, TranslationPath> = {
  planning: "workAdmin.projects.statusPlanning",
  active: "workAdmin.projects.statusActive",
  on_hold: "workAdmin.projects.statusOnHold",
  completed: "workAdmin.projects.statusCompleted",
};

const STATUSES = Object.keys(STATUS_KEY) as ProjectStatus[];

function SectionCard({
  title,
  hint,
  action,
  children,
  className,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "grid gap-3 rounded-2xl border border-border/70 bg-card p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-4",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-300 motion-safe:fill-mode-both",
        "motion-reduce:animate-none",
        className
      )}
    >
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {title}
          </h3>
          {hint ? (
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
              {hint}
            </p>
          ) : null}
        </div>
        {action ? (
          <div className="flex w-full shrink-0 sm:w-auto">{action}</div>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function AdminWorkProjectSheet({
  open,
  onOpenChange,
  isEditing,
  projectId,
  busy,
  form,
  setForm,
  employees,
  workTasks,
  meetings,
  reloadTasks,
  tasksReady,
  onSave,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEditing: boolean;
  projectId: string | null;
  busy: boolean;
  form: ProjectFormState;
  setForm: Dispatch<SetStateAction<ProjectFormState>>;
  employees: Employee[];
  workTasks: WorkTask[];
  meetings: WorkMeeting[];
  reloadTasks: () => Promise<void>;
  tasksReady: boolean;
  onSave: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const formRef = useRef(form);
  formRef.current = form;
  const phaseTasks = useProjectPhaseTasks({
    projectId,
    phases: form.phases,
    setPhases: (update) =>
      setForm((current) => ({ ...current, phases: update(current.phases) })),
    workTasks,
    reloadTasks,
    tasksReady,
    onLinked: (links) => {
      if (!projectId || links.length === 0) return;
      const phases = formRef.current.phases.map((phase) => ({
        ...phase,
        tasks: phase.tasks.map((task) => {
          const link = links.find(
            (row) => row.phaseId === phase.id && row.taskId === task.id
          );
          return link ? { ...task, workTaskId: link.workTaskId } : task;
        }),
      }));
      const payload = normalizeProjectForm({ ...formRef.current, phases });
      if (!payload) return;
      void updateWorkProject(projectId, payload);
    },
  });

  const summary = summarizePhases(form.phases);
  const briefing = projectBriefingPlainText(form, {
    description: t("workAdmin.projects.fieldDescription"),
    technicalDetails: t("workAdmin.projects.fieldTechnicalDetails"),
    fullDescription: t("workAdmin.projects.fieldFullDescription"),
  });

  function setLead(leadId: string) {
    setForm({
      ...form,
      leadId,
      memberIds: form.memberIds.includes(leadId)
        ? form.memberIds
        : [...form.memberIds, leadId],
    });
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(96dvh,100%)] w-full max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-h-[min(92dvh,920px)] sm:w-[min(94vw,40rem)] sm:max-w-[min(94vw,40rem)] sm:p-0 md:w-[min(94vw,68rem)] md:max-w-[min(94vw,68rem)]">
        <DialogHeader className="shrink-0 border-b border-border/55 px-3.5 pb-3 pt-1 sm:px-5 sm:pb-3.5 sm:pt-5">
          <div className="flex flex-wrap items-start justify-between gap-2.5">
            <DialogTitle className="flex min-w-0 items-center gap-2.5 pe-1">
              <span className="icon-well h-9 w-9 shrink-0">
                <FolderKanban className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block truncate">
                  {isEditing
                    ? t("workAdmin.projects.editTitle")
                    : t("workAdmin.projects.createTitle")}
                </span>
                {form.name.trim() ? (
                  <span className="mt-0.5 block truncate text-[12px] font-medium normal-case tracking-normal text-muted-foreground">
                    {form.name.trim()}
                    {" · "}
                    {t("workAdmin.projects.meta", {
                      phases: summary.phases,
                      tasks: summary.tasks,
                    })}
                  </span>
                ) : null}
              </span>
            </DialogTitle>
            <div className="flex shrink-0 gap-1.5">
              <CopyTextButton
                text={briefing}
                label={t("workAdmin.projects.copyBriefing")}
                copiedLabel={t("workAdmin.projects.copiedBriefing")}
              />
              <DownloadTextButton
                text={briefing}
                fileName={form.name}
                label={t("workAdmin.projects.downloadBriefing")}
                doneLabel={t("workAdmin.projects.downloadedBriefing")}
              />
            </div>
          </div>
          <DialogDescription className="text-[13px] leading-relaxed">
            {t("workAdmin.projects.formDesc")}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="bg-muted/20 px-3.5 py-3.5 sm:px-5 sm:py-4">
          <div className="grid min-w-0 gap-3.5 sm:gap-4 md:grid-cols-2 md:items-start">
            <SectionCard title={t("workAdmin.sectionBasics")} className="md:col-start-1">
              <Field
                label={t("workAdmin.projects.fieldName")}
                htmlFor="project-name"
                action={
                  <CopyTextButton
                    text={form.name}
                    label={t("workAdmin.projects.copyField")}
                    copiedLabel={t("workAdmin.projects.copiedBriefing")}
                    className="h-8 w-8 rounded-lg"
                  />
                }
              >
                <Input
                  id="project-name"
                  autoFocus
                  value={form.name}
                  placeholder={t("workAdmin.projects.fieldName")}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  className={inputClass}
                />
              </Field>
              <Field
                label={t("workAdmin.projects.fieldDescription")}
                htmlFor="project-description"
                action={
                  <CopyTextButton
                    text={form.description}
                    label={t("workAdmin.projects.copyField")}
                    copiedLabel={t("workAdmin.projects.copiedBriefing")}
                    className="h-8 w-8 rounded-lg"
                  />
                }
              >
                <Textarea
                  id="project-description"
                  value={form.description}
                  placeholder={t("workAdmin.projects.fieldDescription")}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                  className="min-h-[7.5rem] resize-y rounded-xl text-base leading-relaxed sm:text-sm"
                />
              </Field>
              <div className="grid min-w-0 gap-3 sm:grid-cols-3">
                <Field
                  label={t("workAdmin.projects.fieldStatus")}
                  htmlFor="project-status"
                >
                  <Select
                    value={form.status}
                    onValueChange={(status) =>
                      setForm({ ...form, status: status as ProjectStatus })
                    }
                  >
                    <SelectTrigger id="project-status" className={inputClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {t(STATUS_KEY[status])}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <div className="grid min-w-0 grid-cols-2 gap-2.5 sm:contents">
                  <Field
                    label={t("workAdmin.projects.fieldStart")}
                    htmlFor="project-start"
                    className="min-w-0"
                  >
                    <Input
                      id="project-start"
                      type="date"
                      value={form.startDate}
                      onChange={(event) =>
                        setForm({ ...form, startDate: event.target.value })
                      }
                      className={cn(inputClass, "min-w-0 max-w-full")}
                    />
                  </Field>
                  <Field
                    label={t("workAdmin.projects.fieldEnd")}
                    htmlFor="project-end"
                    className="min-w-0"
                  >
                    <Input
                      id="project-end"
                      type="date"
                      value={form.endDate}
                      onChange={(event) =>
                        setForm({ ...form, endDate: event.target.value })
                      }
                      className={cn(inputClass, "min-w-0 max-w-full")}
                    />
                  </Field>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title={t("workAdmin.projects.sectionAnnex")}
              hint={t("workAdmin.projects.annexHint")}
              className="md:col-start-2 md:row-span-2 md:row-start-1"
            >
              <Field
                label={t("workAdmin.projects.fieldTechnicalDetails")}
                htmlFor="project-technical-details"
                action={
                  <CopyTextButton
                    text={form.technicalDetails}
                    label={t("workAdmin.projects.copyField")}
                    copiedLabel={t("workAdmin.projects.copiedBriefing")}
                    className="h-8 w-8 rounded-lg"
                  />
                }
              >
                <Textarea
                  id="project-technical-details"
                  value={form.technicalDetails}
                  placeholder={t("workAdmin.projects.technicalDetailsPlaceholder")}
                  onChange={(event) =>
                    setForm({ ...form, technicalDetails: event.target.value })
                  }
                  className="min-h-[8.5rem] resize-y rounded-xl text-base leading-relaxed sm:min-h-[9.5rem] sm:text-sm"
                />
              </Field>
              <Field
                label={t("workAdmin.projects.fieldFullDescription")}
                htmlFor="project-full-description"
                action={
                  <CopyTextButton
                    text={form.fullDescription}
                    label={t("workAdmin.projects.copyField")}
                    copiedLabel={t("workAdmin.projects.copiedBriefing")}
                    className="h-8 w-8 rounded-lg"
                  />
                }
              >
                <Textarea
                  id="project-full-description"
                  value={form.fullDescription}
                  placeholder={t("workAdmin.projects.fullDescriptionPlaceholder")}
                  onChange={(event) =>
                    setForm({ ...form, fullDescription: event.target.value })
                  }
                  className="min-h-[10rem] resize-y rounded-xl text-base leading-relaxed sm:min-h-[12rem] sm:text-sm"
                />
              </Field>
            </SectionCard>

            <SectionCard
              title={t("workAdmin.projects.sectionTeam")}
              hint={t("workAdmin.projects.membersHint")}
              className="md:col-start-1 md:row-start-2"
            >
              <Field label={t("workAdmin.projects.fieldLead")} htmlFor="project-lead">
                <Select value={form.leadId || undefined} onValueChange={setLead}>
                  <SelectTrigger id="project-lead" className={inputClass}>
                    <SelectValue placeholder={t("workAdmin.projects.pickLead")} />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <EmployeeMultiPicker
                employees={employees}
                selectedIds={form.memberIds}
                lockedIds={form.leadId ? [form.leadId] : []}
                onChange={(memberIds) => setForm({ ...form, memberIds })}
                label={t("workAdmin.fieldParticipants")}
                listClassName="max-h-36"
              />
            </SectionCard>

            <SectionCard
              className="md:col-span-2"
              title={t("workAdmin.projects.sectionPhases")}
              hint={t("workAdmin.projects.phasesHint")}
              action={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10 w-full touch-manipulation rounded-xl sm:h-8 sm:w-auto sm:rounded-lg"
                  onClick={() =>
                    setForm({
                      ...form,
                      phases: [...form.phases, emptyProjectPhase()],
                    })
                  }
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t("workAdmin.projects.addPhase")}
                </Button>
              }
            >
              <ProjectPhaseEditor
                phases={form.phases}
                members={employees}
                projectId={projectId}
                workTasks={workTasks}
                onChange={(phases) => setForm({ ...form, phases })}
                onAddTask={phaseTasks.openCreate}
                onOpenTask={phaseTasks.setViewing}
                onEditTask={phaseTasks.openEdit}
                onDeleteTask={phaseTasks.setDeleteTarget}
              />
            </SectionCard>
          </div>
        </DialogBody>

        <DialogFooter className="gap-2 bg-card px-3.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:flex-row sm:justify-end sm:px-5 sm:pb-4">
          {isEditing ? (
            <Button
              type="button"
              variant="ghost"
              className={cn(
                "h-11 w-full touch-manipulation rounded-xl text-destructive",
                "sm:me-auto sm:h-10 sm:w-auto"
              )}
              disabled={busy}
              onClick={onDelete}
            >
              {t("workAdmin.projects.delete")}
            </Button>
          ) : null}
          <Button
            type="button"
            className="h-11 w-full touch-manipulation rounded-xl sm:h-10 sm:w-auto"
            disabled={busy}
            onClick={onSave}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("workAdmin.projects.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AdminWorkTaskDialog
      open={phaseTasks.open}
      onOpenChange={phaseTasks.setOpen}
      isEditing={Boolean(phaseTasks.editingTask)}
      busy={phaseTasks.busy}
      taskForm={phaseTasks.form}
      setTaskForm={phaseTasks.setForm}
      editingTask={phaseTasks.editingTask}
      employees={employees}
      meetings={meetings}
      hideOrganicAds
      onSave={(options) => void phaseTasks.save(options)}
    />
    <TaskViewSheet
      task={phaseTasks.viewing}
      open={Boolean(phaseTasks.viewing)}
      onOpenChange={(next) => {
        if (!next) phaseTasks.setViewing(null);
      }}
      employees={new Map(employees.map((employee) => [employee.id, employee]))}
      onEdit={phaseTasks.openEdit}
    />
    <AdminWorkDeleteDialog
      target={
        phaseTasks.deleteTarget
          ? {
              kind: "task",
              id: phaseTasks.deleteTarget.id,
              title: phaseTasks.deleteTarget.title,
            }
          : null
      }
      busy={phaseTasks.busy}
      onOpenChange={(next) => {
        if (!next) phaseTasks.setDeleteTarget(null);
      }}
      onConfirm={() => void phaseTasks.confirmDelete()}
    />
    </>
  );
}
