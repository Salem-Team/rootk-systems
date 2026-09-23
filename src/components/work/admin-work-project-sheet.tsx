"use client";

import type { ReactNode } from "react";
import { FolderKanban, Loader2, Plus } from "lucide-react";
import { EmployeeMultiPicker } from "@/components/work/employee-multi-picker";
import { Field } from "@/components/work/admin-work-field";
import { ProjectPhaseEditor } from "@/components/work/project-phase-editor";
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
import type { TranslationPath } from "@/i18n";
import { emptyProjectPhase } from "@/lib/work-project";
import type { ProjectFormState } from "@/lib/work-project";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types";
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
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {title}
          </h3>
          {hint ? (
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
              {hint}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function AdminWorkProjectSheet({
  open,
  onOpenChange,
  isEditing,
  busy,
  form,
  setForm,
  employees,
  onSave,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEditing: boolean;
  busy: boolean;
  form: ProjectFormState;
  setForm: (next: ProjectFormState) => void;
  employees: Employee[];
  onSave: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const members = employees.filter((employee) =>
    form.memberIds.includes(employee.id)
  );

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(94dvh,880px)] w-full max-w-none flex-col gap-0 overflow-hidden p-0 sm:w-[min(92vw,42rem)] sm:max-w-[min(92vw,42rem)] sm:p-0">
        <DialogHeader className="shrink-0 border-b border-border/55 px-4 pb-3.5 pt-1 sm:px-5 sm:pt-5">
          <DialogTitle className="flex items-center gap-2.5">
            <span className="icon-well h-9 w-9 shrink-0">
              <FolderKanban className="h-4 w-4" aria-hidden />
            </span>
            {isEditing
              ? t("workAdmin.projects.editTitle")
              : t("workAdmin.projects.createTitle")}
          </DialogTitle>
          <DialogDescription className="text-[13px] leading-relaxed">
            {t("workAdmin.projects.formDesc")}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="bg-muted/20 px-4 py-4 sm:px-5">
          <div className="grid gap-4">
            <SectionCard title={t("workAdmin.sectionBasics")}>
              <Field label={t("workAdmin.projects.fieldName")} htmlFor="project-name">
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
              >
                <Textarea
                  id="project-description"
                  value={form.description}
                  placeholder={t("workAdmin.projects.fieldDescription")}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                  className="min-h-[72px] rounded-xl"
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-3">
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
                <Field
                  label={t("workAdmin.projects.fieldStart")}
                  htmlFor="project-start"
                >
                  <Input
                    id="project-start"
                    type="date"
                    value={form.startDate}
                    onChange={(event) =>
                      setForm({ ...form, startDate: event.target.value })
                    }
                    className={inputClass}
                  />
                </Field>
                <Field label={t("workAdmin.projects.fieldEnd")} htmlFor="project-end">
                  <Input
                    id="project-end"
                    type="date"
                    value={form.endDate}
                    onChange={(event) =>
                      setForm({ ...form, endDate: event.target.value })
                    }
                    className={inputClass}
                  />
                </Field>
              </div>
            </SectionCard>

            <SectionCard
              title={t("workAdmin.projects.sectionTeam")}
              hint={t("workAdmin.projects.membersHint")}
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
              title={t("workAdmin.projects.sectionPhases")}
              hint={t("workAdmin.projects.phasesHint")}
              action={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-lg"
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
                members={members}
                onChange={(phases) => setForm({ ...form, phases })}
              />
            </SectionCard>
          </div>
        </DialogBody>

        <DialogFooter className="bg-card px-4 py-3 sm:px-5">
          {isEditing ? (
            <Button
              type="button"
              variant="ghost"
              className={cn("h-11 rounded-xl text-destructive sm:me-auto sm:h-10")}
              disabled={busy}
              onClick={onDelete}
            >
              {t("workAdmin.projects.delete")}
            </Button>
          ) : null}
          <Button
            type="button"
            className="h-11 rounded-xl sm:h-10"
            disabled={busy}
            onClick={onSave}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("workAdmin.projects.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
