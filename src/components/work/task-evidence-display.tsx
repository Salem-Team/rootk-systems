"use client";

import { ExternalLink, FileCheck2 } from "lucide-react";
import { TaskEvidenceBadge } from "@/components/work/task-evidence-badge";
import { useTranslation } from "@/hooks/use-translation";
import { evidenceLinkLabel, resolveEvidenceBadgeState } from "@/lib/task-evidence";
import { cn } from "@/lib/utils";
import type { WorkTask } from "@/types/work";

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
