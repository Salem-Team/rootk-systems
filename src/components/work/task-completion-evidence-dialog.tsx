"use client";

import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import {
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  Link2,
  Loader2,
  Plus,
  StickyNote,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/hooks/use-translation";
import {
  addEvidenceLink,
  EVIDENCE_LINKS_MAX,
  EVIDENCE_NOTES_MIN,
  evidenceLinkLabel,
  resolveEvidenceBadgeState,
  resolveTaskEvidence,
  validateTaskEvidence,
} from "@/lib/task-evidence";
import { updateWorkTaskStatus } from "@/services/work.service";
import type { WorkTask } from "@/types/work";
import { cn } from "@/lib/utils";

export function TaskEvidenceBadge({
  task,
  className,
}: {
  task: WorkTask;
  className?: string;
}) {
  const { t } = useTranslation();
  const state = resolveEvidenceBadgeState(task);
  if (state === "none") return null;

  return (
    <Badge
      variant={state === "submitted" ? "success" : "warning"}
      className={cn("h-5 gap-1", className)}
    >
      <FileCheck2 className="h-3 w-3" aria-hidden />
      {state === "submitted"
        ? t("workAdmin.evidenceBadgeDone")
        : t("workAdmin.evidenceBadge")}
    </Badge>
  );
}

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
  const [links, setLinks] = useState<string[]>([]);
  const [linkDraft, setLinkDraft] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !task) return;
    const existing = resolveTaskEvidence(task);
    setLinks(existing.links);
    setNotes(existing.notes);
    setLinkDraft("");
    setLinkError(null);
    setBusy(false);
    setTouched(false);
  }, [open, task]);

  const requireLinks = Boolean(task?.requireEvidenceLinks);
  const requireNotes = Boolean(task?.requireEvidenceNotes);
  const showLinks = requireLinks || requireNotes;
  const showNotes = requireNotes || requireLinks;

  const validation = useMemo(() => {
    if (!task) return { ok: true as const };
    return validateTaskEvidence(task, { links, notes });
  }, [task, links, notes]);

  function tryAddLink(raw = linkDraft) {
    const result = addEvidenceLink(links, raw);
    if (result.error === "invalid") {
      setLinkError(t("workEvidence.linkInvalid"));
      return;
    }
    if (result.error === "duplicate") {
      setLinkError(t("workEvidence.linkDuplicate"));
      return;
    }
    if (result.error === "limit") {
      setLinkError(t("workEvidence.linkLimit", { max: EVIDENCE_LINKS_MAX }));
      return;
    }
    setLinks(result.links);
    setLinkDraft("");
    setLinkError(null);
  }

  function onLinkKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      tryAddLink();
    }
  }

  async function submit() {
    if (!task) return;
    setTouched(true);

    let nextLinks = links;
    if (linkDraft.trim()) {
      const added = addEvidenceLink(links, linkDraft);
      if (added.error) {
        setLinkError(
          added.error === "duplicate"
            ? t("workEvidence.linkDuplicate")
            : added.error === "limit"
              ? t("workEvidence.linkLimit", { max: EVIDENCE_LINKS_MAX })
              : t("workEvidence.linkInvalid")
        );
        if (requireLinks && links.length === 0) {
          toast.error(t("workEvidence.validationLinks"));
          return;
        }
      } else {
        nextLinks = added.links;
        setLinks(added.links);
        setLinkDraft("");
        setLinkError(null);
      }
    }

    const check = validateTaskEvidence(task, { links: nextLinks, notes });
    if (!check.ok) {
      toast.error(
        check.code === "notes"
          ? t("workEvidence.validationNotes")
          : check.code === "links"
            ? t("workEvidence.validationLinks")
            : t("workEvidence.validationBoth")
      );
      return;
    }

    setBusy(true);
    const res = await updateWorkTaskStatus(task.id, "completed", {
      links: nextLinks,
      notes: notes.trim(),
    });
    setBusy(false);
    if (!res.success) {
      toast.error(res.message ?? t("common.error"));
      return;
    }
    toast.success(t("workEvidence.submitted"));
    onCompleted(res.data);
    onOpenChange(false);
  }

  if (!task) return null;

  const notesLen = notes.trim().length;
  const notesOk = !requireNotes || notesLen >= EVIDENCE_NOTES_MIN;

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
              {requireLinks ? (
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
              {requireNotes ? (
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
            <div className="space-y-2">
              <Label htmlFor="evidence-link-input" className="flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5" aria-hidden />
                {t("workEvidence.fieldLinks")}
                {requireLinks ? (
                  <span className="text-destructive">*</span>
                ) : (
                  <span className="text-[11px] font-normal text-muted-foreground">
                    ({t("common.optional")})
                  </span>
                )}
              </Label>

              {links.length > 0 ? (
                <ul className="flex flex-col gap-1.5">
                  {links.map((link) => (
                    <li
                      key={link}
                      className="group flex items-center gap-2 rounded-lg border border-border/70 bg-card px-2.5 py-2"
                    >
                      <ExternalLink
                        className="h-3.5 w-3.5 shrink-0 text-primary"
                        aria-hidden
                      />
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-foreground underline-offset-2 hover:underline"
                        dir="ltr"
                        title={link}
                      >
                        {evidenceLinkLabel(link)}
                      </a>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          setLinks((prev) => prev.filter((x) => x !== link))
                        }
                        aria-label={t("common.remove")}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="flex gap-2">
                <Input
                  id="evidence-link-input"
                  value={linkDraft}
                  onChange={(e) => {
                    setLinkDraft(e.target.value);
                    if (linkError) setLinkError(null);
                  }}
                  onKeyDown={onLinkKeyDown}
                  placeholder={t("workEvidence.linkInputPlaceholder")}
                  className={cn(
                    "font-mono text-[13px]",
                    ((touched &&
                      requireLinks &&
                      links.length === 0 &&
                      !validation.ok) ||
                      linkError) &&
                      "border-destructive"
                  )}
                  dir="ltr"
                  disabled={links.length >= EVIDENCE_LINKS_MAX}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0"
                  onClick={() => tryAddLink()}
                  disabled={!linkDraft.trim() || links.length >= EVIDENCE_LINKS_MAX}
                >
                  <Plus className="h-4 w-4" />
                  {t("workEvidence.addLink")}
                </Button>
              </div>
              <p
                className={cn(
                  "text-[11px]",
                  linkError ? "text-destructive" : "text-muted-foreground"
                )}
              >
                {linkError ?? t("workEvidence.linksHint")}
              </p>
            </div>
          ) : null}

          {showNotes ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="evidence-notes" className="flex items-center gap-1.5">
                  <StickyNote className="h-3.5 w-3.5" aria-hidden />
                  {t("workEvidence.fieldNotes")}
                  {requireNotes ? (
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
                    requireNotes && !notesOk
                      ? "text-destructive"
                      : "text-muted-foreground"
                  )}
                >
                  {notesLen}
                  {requireNotes ? `/${EVIDENCE_NOTES_MIN}+` : ""}
                </span>
              </div>
              <Textarea
                id="evidence-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("workEvidence.notesPlaceholder")}
                className={cn(
                  "min-h-[120px]",
                  touched &&
                    requireNotes &&
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
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            {t("common.cancel")}
          </Button>
          <Button type="button" disabled={busy} onClick={() => void submit()}>
            {busy ? (
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

export function TaskEvidenceDisplay({
  task,
  className,
}: {
  task: WorkTask;
  className?: string;
}) {
  const { t } = useTranslation();
  const links = task.evidenceLinks ?? [];
  const notes = (task.evidenceNotes ?? "").trim();
  const requires = Boolean(
    task.requireEvidenceLinks || task.requireEvidenceNotes
  );
  const hasContent = links.length > 0 || notes.length > 0;
  const badgeState = resolveEvidenceBadgeState(task);

  if (!requires && !hasContent) return null;

  return (
    <section
      className={cn(
        "rounded-xl border px-3.5 py-3.5",
        badgeState === "submitted"
          ? "border-emerald-500/25 bg-emerald-500/[0.06]"
          : "border-amber-500/25 bg-amber-500/[0.06]",
        className
      )}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-card",
            badgeState === "submitted"
              ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
              : "border-amber-500/30 text-amber-700 dark:text-amber-300"
          )}
        >
          <FileCheck2 className="h-3.5 w-3.5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[13px] font-semibold">
              {t("workEvidence.sectionTitle")}
            </h3>
            <TaskEvidenceBadge task={task} />
          </div>

          {requires && !hasContent ? (
            <p className="mt-1 text-[12px] text-muted-foreground">
              {task.requireEvidenceLinks && task.requireEvidenceNotes
                ? t("workEvidence.pendingBoth")
                : task.requireEvidenceLinks
                  ? t("workEvidence.pendingLinks")
                  : t("workEvidence.pendingNotes")}
            </p>
          ) : null}

          {links.length > 0 ? (
            <ul className="mt-3 space-y-1.5">
              {links.map((link) => (
                <li key={link}>
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border/60 bg-card/80 px-2 py-1 text-[12.5px] font-medium text-primary underline-offset-2 hover:underline"
                    dir="ltr"
                    title={link}
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{evidenceLinkLabel(link)}</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : null}

          {notes ? (
            <div className="mt-3 rounded-lg border border-border/50 bg-card/70 px-3 py-2.5">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t("workEvidence.fieldNotes")}
              </p>
              <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/90">
                {notes}
              </p>
            </div>
          ) : null}

          {!hasContent && task.status === "completed" ? (
            <p className="mt-2 text-[12px] text-muted-foreground">
              {t("workEvidence.emptySubmitted")}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
