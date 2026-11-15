"use client";

import { FileText } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import {
  CopyTextButton,
  DownloadTextButton,
} from "@/components/work/project-text-actions";
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
  const blocks = projectBriefingBlocks(project);
  if (blocks.length === 0) return null;
  const briefing = projectBriefingPlainText(project, {
    description: t(LABEL_KEY.description),
    technicalDetails: t(LABEL_KEY.technicalDetails),
    fullDescription: t(LABEL_KEY.fullDescription),
  });

  return (
    <section className="grid gap-3 rounded-2xl border border-border/70 bg-card p-3.5 sm:p-4">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            <FileText className="h-3.5 w-3.5" aria-hidden />
            {t("workAdmin.projects.sectionAnnex")}
          </h3>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
            {t("workAdmin.projects.annexReadOnly")}
          </p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <CopyTextButton
            text={briefing}
            label={t("workAdmin.projects.copyBriefing")}
            copiedLabel={t("workAdmin.projects.copiedBriefing")}
          />
          <DownloadTextButton
            text={briefing}
            fileName={project.name}
            label={t("workAdmin.projects.downloadBriefing")}
            doneLabel={t("workAdmin.projects.downloadedBriefing")}
          />
        </div>
      </div>
      {blocks.map((block) => (
        <div key={block.key} className="grid gap-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[12px] font-semibold">{t(LABEL_KEY[block.key])}</p>
            <CopyTextButton
              text={block.body}
              label={t("workAdmin.projects.copyField")}
              copiedLabel={t("workAdmin.projects.copiedBriefing")}
              className="h-8 w-8 rounded-lg"
            />
          </div>
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
