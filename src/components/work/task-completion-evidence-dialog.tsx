"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  CheckCircle2,
  FileCheck2,
  Link2,
  Loader2,
  StickyNote,
} from "lucide-react";
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
import { easeOutExpo, snappySpring, softSpring } from "@/lib/animations";
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
  const reduceMotion = useReducedMotion();
  const evidence = useTaskCompletionEvidence({
    task,
    open,
    onOpenChange,
    onCompleted,
  });

  if (!task) return null;

  const showLinks = evidence.requireLinks;
  const showNotes = true;
  const notesLen = evidence.notes.trim().length;
  const notesOk = !evidence.requireNotes || notesLen >= EVIDENCE_NOTES_MIN;
  const showInvalidLinks =
    evidence.touched &&
    evidence.requireLinks &&
    evidence.links.length === 0 &&
    !evidence.validation.ok;
  const notesProgress = Math.min(1, notesLen / EVIDENCE_NOTES_MIN);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden sm:max-w-lg">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-emerald-500/12 via-emerald-500/5 to-transparent"
        />

        <DialogHeader className="relative">
          <motion.div
            initial={reduceMotion ? false : { scale: 0.85, rotate: -8, y: 6 }}
            animate={{ scale: 1, rotate: 0, y: 0 }}
            transition={softSpring}
            className="mb-1 flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 text-emerald-700 shadow-[0_10px_24px_-14px_rgba(16,185,129,0.8)] dark:text-emerald-300"
          >
            <FileCheck2 className="h-5 w-5" aria-hidden />
          </motion.div>
          <DialogTitle>{t("workEvidence.completeTitle")}</DialogTitle>
          <DialogDescription>
            {t("workEvidence.completeDescNotes", { title: task.title })}
          </DialogDescription>
        </DialogHeader>

        <motion.div
          initial={reduceMotion ? false : { y: 8, opacity: 0.01 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.35, ease: easeOutExpo, delay: 0.05 }}
          className="relative space-y-4 py-1"
        >
          <div className="rounded-xl border border-border/70 bg-gradient-to-br from-muted/45 via-muted/20 to-transparent px-3.5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {t("workEvidence.requirements")}
            </p>
            <ul className="mt-2.5 space-y-2 text-[13px]">
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
                  <span className="text-destructive">*</span>
                </Label>
                <span
                  className={cn(
                    "font-mono text-[11px] tabular-nums",
                    !notesOk ? "text-destructive" : "text-emerald-600"
                  )}
                >
                  {notesLen}/{EVIDENCE_NOTES_MIN}+
                </span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className={cn(
                    "h-full rounded-full",
                    notesOk ? "bg-emerald-500" : "bg-primary"
                  )}
                  animate={{ width: `${notesProgress * 100}%` }}
                  transition={snappySpring}
                />
              </div>
              <Textarea
                id="evidence-notes"
                value={evidence.notes}
                onChange={(e) => evidence.setNotes(e.target.value)}
                placeholder={t("workEvidence.notesPlaceholder")}
                className={cn(
                  "min-h-[120px] transition-[border-color,box-shadow] duration-200",
                  evidence.touched && !notesOk && "border-destructive",
                  notesOk &&
                    "border-emerald-500/40 focus-visible:ring-emerald-500/30"
                )}
              />
            </div>
          ) : null}
        </motion.div>

        <DialogFooter className="relative gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={evidence.busy}
            onClick={() => onOpenChange(false)}
          >
            {t("common.cancel")}
          </Button>
          <motion.div
            whileHover={reduceMotion || evidence.busy ? undefined : { scale: 1.02 }}
            whileTap={reduceMotion || evidence.busy ? undefined : { scale: 0.98 }}
            transition={snappySpring}
          >
            <Button
              type="button"
              disabled={evidence.busy}
              className="min-w-[9.5rem] shadow-[0_10px_24px_-14px_rgba(16,185,129,0.9)]"
              onClick={() => void evidence.submit()}
            >
              {evidence.busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {t("workEvidence.done")}
            </Button>
          </motion.div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
