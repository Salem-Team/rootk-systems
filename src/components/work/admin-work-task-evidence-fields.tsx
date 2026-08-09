"use client";

import { FileCheck2, Link2, StickyNote } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { TaskEvidenceDisplay } from "@/components/work/task-completion-evidence-dialog";
import { useTranslation } from "@/hooks/use-translation";
import { taskHasSubmittedEvidence } from "@/lib/task-evidence";
import { cn } from "@/lib/utils";
import type { WorkTask } from "@/types/work";
import type { TaskFormState } from "@/components/work/admin-work-panel-types";

export function AdminWorkTaskEvidenceFields({
  taskForm,
  setTaskForm,
  editingTask,
}: {
  taskForm: TaskFormState;
  setTaskForm: (updater: (prev: TaskFormState) => TaskFormState) => void;
  editingTask?: WorkTask;
}) {
  const { t } = useTranslation();
  const evidenceOn = taskForm.requireEvidenceLinks || taskForm.requireEvidenceNotes;

  return (
    <div
      className={cn(
        "rounded-xl border p-3.5 transition-colors",
        evidenceOn
          ? "border-amber-500/30 bg-amber-500/[0.06]"
          : "border-border/70 bg-muted/20"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span
            className={cn(
              "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-card",
              evidenceOn
                ? "border-amber-500/30 text-amber-700 dark:text-amber-300"
                : "border-border/60 text-muted-foreground"
            )}
          >
            <FileCheck2 className="h-3.5 w-3.5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">
              {t("workAdmin.evidenceSection")}
            </p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
              {t("workAdmin.evidenceSectionDesc")}
            </p>
          </div>
        </div>
        <Switch
          id="req-evidence-master"
          checked={evidenceOn}
          onCheckedChange={(checked) =>
            setTaskForm((p) =>
              checked
                ? {
                    ...p,
                    requireEvidenceLinks: true,
                    requireEvidenceNotes: false,
                  }
                : {
                    ...p,
                    requireEvidenceLinks: false,
                    requireEvidenceNotes: false,
                  }
            )
          }
          aria-label={t("workAdmin.evidenceOnLabel")}
        />
      </div>

      <div className="mt-3 rounded-lg border border-border/60 bg-card/80 px-3 py-2.5">
        <p className="text-[13px] font-medium">
          {evidenceOn
            ? t("workAdmin.evidenceOnLabel")
            : t("workAdmin.evidenceOffLabel")}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {evidenceOn
            ? t("workAdmin.evidenceOnHint")
            : t("workAdmin.evidenceOffHint")}
        </p>
      </div>

      {evidenceOn ? (
        <div className="mt-3 space-y-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            {t("workAdmin.evidencePickAtLeast")}
          </p>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card px-3 py-2.5">
            <div className="flex min-w-0 items-start gap-2.5">
              <Link2
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
                aria-hidden
              />
              <div className="min-w-0">
                <Label
                  htmlFor="req-evidence-links"
                  className="text-sm font-medium"
                >
                  {t("workAdmin.requireEvidenceLinks")}
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  {t("workAdmin.requireEvidenceLinksDesc")}
                </p>
              </div>
            </div>
            <Switch
              id="req-evidence-links"
              checked={taskForm.requireEvidenceLinks}
              onCheckedChange={(checked) =>
                setTaskForm((p) => {
                  const next = {
                    ...p,
                    requireEvidenceLinks: checked,
                  };
                  if (!checked && !p.requireEvidenceNotes) {
                    return {
                      ...next,
                      requireEvidenceNotes: true,
                    };
                  }
                  return next;
                })
              }
              aria-label={t("workAdmin.requireEvidenceLinks")}
            />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card px-3 py-2.5">
            <div className="flex min-w-0 items-start gap-2.5">
              <StickyNote
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
                aria-hidden
              />
              <div className="min-w-0">
                <Label
                  htmlFor="req-evidence-notes"
                  className="text-sm font-medium"
                >
                  {t("workAdmin.requireEvidenceNotes")}
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  {t("workAdmin.requireEvidenceNotesDesc")}
                </p>
              </div>
            </div>
            <Switch
              id="req-evidence-notes"
              checked={taskForm.requireEvidenceNotes}
              onCheckedChange={(checked) =>
                setTaskForm((p) => {
                  const next = {
                    ...p,
                    requireEvidenceNotes: checked,
                  };
                  if (!checked && !p.requireEvidenceLinks) {
                    return {
                      ...next,
                      requireEvidenceLinks: true,
                    };
                  }
                  return next;
                })
              }
              aria-label={t("workAdmin.requireEvidenceNotes")}
            />
          </div>
        </div>
      ) : null}

      {editingTask &&
      (editingTask.requireEvidenceLinks ||
        editingTask.requireEvidenceNotes ||
        taskHasSubmittedEvidence(editingTask)) ? (
        <TaskEvidenceDisplay task={editingTask} className="mt-3" />
      ) : null}
    </div>
  );
}
