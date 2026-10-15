"use client";

import { useState } from "react";
import { Check, Copy, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";
import { copyPlainText } from "@/lib/copy-text";
import {
  projectBriefingBlocks,
  projectBriefingPlainText,
  type ProjectBriefingKey,
} from "@/lib/work-project";
import type { TranslationPath } from "@/i18n";

const LABEL_KEY: Record<ProjectBriefingKey, TranslationPath> = {
  description: "workAdmin.projects.fieldDescription",
  technicalDetails: "workAdmin.projects.fieldTechnicalDetails",
  fullDescription: "workAdmin.projects.fieldFullDescription",
};

/** Read-only annex and description for people assigned to the project. */
export function ProjectAnnexReadout({
  project,
}: {
  project: {
    name: string;
    description?: string;
    technicalDetails?: string;
    fullDescription?: string;
  };
}) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const blocks = projectBriefingBlocks(project);
  if (blocks.length === 0) return null;

  async function copyBriefing() {
    const text = projectBriefingPlainText(project, {
      description: t(LABEL_KEY.description),
      technicalDetails: t(LABEL_KEY.technicalDetails),
      fullDescription: t(LABEL_KEY.fullDescription),
    });
    const ok = await copyPlainText(text);
    if (!ok) {
      toast.error(t("workAdmin.projects.copyBriefingFailed"));
      return;
    }
    setCopied(true);
    toast.success(t("workAdmin.projects.copiedBriefing"));
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="grid gap-3 rounded-2xl border border-border/70 bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            <FileText className="h-3.5 w-3.5" aria-hidden />
            {t("workAdmin.projects.sectionAnnex")}
          </h3>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
            {t("workAdmin.projects.annexReadOnly")}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 shrink-0 rounded-lg"
          onClick={() => void copyBriefing()}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <Copy className="h-3.5 w-3.5" aria-hidden />
          )}
          {copied
            ? t("workAdmin.projects.copiedBriefing")
            : t("workAdmin.projects.copyBriefing")}
        </Button>
      </div>
      {blocks.map((block) => (
        <div key={block.key} className="grid gap-1">
          <p className="text-[12px] font-semibold">{t(LABEL_KEY[block.key])}</p>
          <p
            dir="auto"
            className="select-text whitespace-pre-wrap break-words text-[13px] leading-relaxed text-foreground"
          >
            {block.body}
          </p>
        </div>
      ))}
    </section>
  );
}
