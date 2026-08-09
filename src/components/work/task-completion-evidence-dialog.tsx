"use client";

import { CheckCircle2, FileCheck2, Link2, Loader2, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TaskEvidenceLinkInput } from "@/components/work/task-evidence-link-input";
import { useTaskCompletionEvidence } from "@/components/work/use-task-completion-evidence";
import { useTranslation } from "@/hooks/use-translation";
import { EVIDENCE_NOTES_MIN } from "@/lib/task-evidence";
import { cn } from "@/lib/utils";
import type { WorkTask } from "@/types/work";

export { TaskEvidenceBadge } from "@/components/work/task-evidence-badge";
export { TaskEvidenceDisplay } from "@/components/work/task-evidence-display";

export function TaskCompletionEvidenceDialog({
  task,
  open,
  onOpenChange,
  onCompleted,
}: {
  task: WorkTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted: (task: WorkTask) => void;
}) {
  const { t } = useTranslation();
  const evidence = useTaskCompletionEvidence({ task, open, onOpenChange, onCompleted });

  if (!task) return null;

  const showLinks = evidence.requireLinks || evidence.requireNotes;
  const showNotes = evidence.requireNotes || evidence.requireLinks;
  const notesLen = evidence.notes.trim().length;
  const notesOk = !evidence.requireNotes || notesLen >= EVIDENCE_NOTES_MIN;
  const showInvalidLinks =
    evidence.touched &&
    evidence.requireLinks &&
    evidence.links.length === 0 &&
    !evidence.validation.ok;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
            <FileCheck2 className="h-5 w-5" aria-hidden />
          </div>
          <DialogTitle>{t("workEvidence.completeTitle")}</DialogTitle>
          <DialogDescription>
            {t("workEvidence.completeDesc", { title: task.title })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="rounded-xl border border-border/70 bg-gradient-to-br from-muted/40 to-muted/10 px-3.5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {t("workEvidence.requirements")}
            </p>
            <ul className="mt-2.5 space-y-2 text-[13px]">
              {evidence.requireLinks ? (
                <li className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Link2 className="h-3 w-3" aria-hidden />
                  </span>
                  <span>
                    <span className="font-medium">{t("workEvidence.reqLinks")}</span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {t("workEvidence.reqLinksHint")}
                    </span>
                  </span>
                </li>
              ) : null}
              {evidence.requireNotes ? (
                <li className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <StickyNote className="h-3 w-3" aria-hidden />
                  </span>
                  <span>
                    <span className="font-medium">{t("workEvidence.reqNotes")}</span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {t("workEvidence.reqNotesHint")}
                    </span>
                  </span>
                </li>
              ) : null}
            </ul>
          </div>

          {showLinks ? (
            <TaskEvidenceLinkInput
              links={evidence.links}
              onRemoveLink={evidence.removeLink}
              linkDraft={evidence.linkDraft}
              onLinkDraftChange={(value) => {
                evidence.setLinkDraft(value);
                if (evidence.linkError) evidence.setLinkError(null);
              }}
              onKeyDown={evidence.onLinkKeyDown}
              onAddLink={() => evidence.tryAddLink()}
              linkError={evidence.linkError}
              requireLinks={evidence.requireLinks}
              showInvalid={showInvalidLinks}
            />
          ) : null}

          {showNotes ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="evidence-notes" className="flex items-center gap-1.5">
                  <StickyNote className="h-3.5 w-3.5" aria-hidden />
                  {t("workEvidence.fieldNotes")}
                  {evidence.requireNotes ? (
                    <span className="text-destructive">*</span>
                  ) : (
                    <span className="text-[11px] font-normal text-muted-foreground">
                      ({t("common.optional")})
                    </span>
                  )}
                </Label>
                <span
                  className={cn(
                    "font-mono text-[11px] tabular-nums",
                    evidence.requireNotes && !notesOk
                      ? "text-destructive"
                      : "text-muted-foreground"
                  )}
                >
                  {notesLen}
                  {evidence.requireNotes ? `/${EVIDENCE_NOTES_MIN}+` : ""}
                </span>
              </div>
              <Textarea
                id="evidence-notes"
                value={evidence.notes}
                onChange={(e) => evidence.setNotes(e.target.value)}
                placeholder={t("workEvidence.notesPlaceholder")}
                className={cn(
                  "min-h-[120px]",
                  evidence.touched &&
                    evidence.requireNotes &&
                    !notesOk &&
                    "border-destructive"
                )}
              />
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={evidence.busy}
            onClick={() => onOpenChange(false)}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            disabled={evidence.busy}
            onClick={() => void evidence.submit()}
          >
            {evidence.busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {t("workEvidence.submitComplete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
