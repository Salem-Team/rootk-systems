"use client";

import { Download, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/hooks/use-translation";
import { newProposalSection } from "@/lib/crm/technical-proposal";
import { openTechnicalProposalPrint } from "@/lib/crm/technical-proposal-print";
import type {
  CrmClientRequestKind,
  TechnicalProposalDocument,
} from "@/types/crm";

export function TechnicalProposalEditor({
  kind,
  leadName,
  doc,
  saved,
  canEdit,
  onChange,
}: {
  kind: CrmClientRequestKind;
  leadName: string;
  doc: TechnicalProposalDocument | null;
  saved: TechnicalProposalDocument | null;
  canEdit: boolean;
  onChange?: (next: TechnicalProposalDocument) => void;
}) {
  const { t } = useTranslation();

  function patch(next: Partial<TechnicalProposalDocument>) {
    if (!doc || !onChange) return;
    onChange({ ...doc, ...next });
  }

  function preview(source: TechnicalProposalDocument) {
    const popup = openTechnicalProposalPrint(source, leadName);
    if (!popup) toast.error(t("crm.clientRequests.proposal.popup"));
  }

  if (!canEdit) {
    if (!saved) {
      return (
        <p className="rounded-xl bg-muted/40 px-3 py-2 text-[12px] leading-relaxed text-muted-foreground">
          {t("crm.clientRequests.proposal.waiting")}
        </p>
      );
    }
    return (
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full"
        onClick={() => preview(saved)}
      >
        <Download className="h-4 w-4" />
        {t("crm.clientRequests.proposal.download")}
      </Button>
    );
  }

  if (!doc) return null;

  return (
    <div className="space-y-2.5 rounded-xl border border-primary/20 bg-primary/[0.03] p-2.5">
      <div>
        <p className="text-[13px] font-semibold">
          {t(`crm.clientRequests.templateTitles.${kind}`)}
        </p>
        <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
          {t("crm.clientRequests.proposal.editHint")}
        </p>
      </div>
      <label className="grid gap-1 text-[12px] font-medium">
        {t("crm.clientRequests.proposal.title")}
        <Input
          value={doc.title}
          onChange={(event) => patch({ title: event.target.value })}
          className="h-11"
        />
      </label>
      <label className="grid gap-1 text-[12px] font-medium">
        {t("crm.clientRequests.proposal.subtitle")}
        <Input
          value={doc.subtitle}
          onChange={(event) => patch({ subtitle: event.target.value })}
          placeholder={t("crm.clientRequests.proposal.subtitlePlaceholder")}
          className="h-11"
        />
      </label>
      <label className="grid gap-1 text-[12px] font-medium">
        {t("crm.clientRequests.proposal.intro")}
        <Textarea
          value={doc.intro}
          onChange={(event) => patch({ intro: event.target.value })}
          placeholder={t("crm.clientRequests.proposal.introPlaceholder")}
          className="min-h-20 text-[14px]"
        />
      </label>

      <div className="space-y-2">
        <p className="text-[12px] font-semibold">
          {t("crm.clientRequests.proposal.sections")}
        </p>
        {doc.sections.map((section, index) => (
          <div
            key={section.id}
            className="space-y-2 rounded-xl border border-border/70 bg-card p-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-semibold text-muted-foreground">
                {index + 1}
              </span>
              {doc.sections.length > 1 ? (
                <button
                  type="button"
                  className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[12px] font-medium text-muted-foreground"
                  onClick={() =>
                    patch({
                      sections: doc.sections.filter(
                        (row) => row.id !== section.id
                      ),
                    })
                  }
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t("crm.clientRequests.proposal.remove")}
                </button>
              ) : null}
            </div>
            <Input
              value={section.title}
              onChange={(event) =>
                patch({
                  sections: doc.sections.map((row) =>
                    row.id === section.id
                      ? { ...row, title: event.target.value }
                      : row
                  ),
                })
              }
              placeholder={t("crm.clientRequests.proposal.sectionTitle")}
              className="h-11"
            />
            <Textarea
              value={section.intro}
              onChange={(event) =>
                patch({
                  sections: doc.sections.map((row) =>
                    row.id === section.id
                      ? { ...row, intro: event.target.value }
                      : row
                  ),
                })
              }
              placeholder={t("crm.clientRequests.proposal.sectionIntro")}
              className="min-h-16 text-[14px]"
            />
            {section.bullets.map((bullet, bulletIndex) => (
              <div key={`${section.id}-${bulletIndex}`} className="flex gap-1.5">
                <Input
                  value={bullet}
                  onChange={(event) =>
                    patch({
                      sections: doc.sections.map((row) =>
                        row.id === section.id
                          ? {
                              ...row,
                              bullets: row.bullets.map((item, itemIndex) =>
                                itemIndex === bulletIndex
                                  ? event.target.value
                                  : item
                              ),
                            }
                          : row
                      ),
                    })
                  }
                  placeholder={t("crm.clientRequests.proposal.bullet")}
                  className="h-11"
                />
                {section.bullets.length > 1 ? (
                  <button
                    type="button"
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border/70 text-muted-foreground"
                    onClick={() =>
                      patch({
                        sections: doc.sections.map((row) =>
                          row.id === section.id
                            ? {
                                ...row,
                                bullets: row.bullets.filter(
                                  (_, itemIndex) => itemIndex !== bulletIndex
                                ),
                              }
                            : row
                        ),
                      })
                    }
                    aria-label={t("crm.clientRequests.proposal.remove")}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            ))}
            <button
              type="button"
              className="inline-flex h-9 items-center gap-1 text-[12px] font-semibold text-primary"
              onClick={() =>
                patch({
                  sections: doc.sections.map((row) =>
                    row.id === section.id
                      ? { ...row, bullets: [...row.bullets, ""] }
                      : row
                  ),
                })
              }
            >
              <Plus className="h-3.5 w-3.5" />
              {t("crm.clientRequests.proposal.addBullet")}
            </button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          className="h-10 w-full"
          onClick={() =>
            patch({ sections: [...doc.sections, newProposalSection()] })
          }
        >
          <Plus className="h-4 w-4" />
          {t("crm.clientRequests.proposal.addSection")}
        </Button>
      </div>

      <label className="grid gap-1 text-[12px] font-medium">
        {t("crm.clientRequests.proposal.noteTitle")}
        <Input
          value={doc.noteTitle}
          onChange={(event) => patch({ noteTitle: event.target.value })}
          className="h-11"
        />
      </label>
      <label className="grid gap-1 text-[12px] font-medium">
        {t("crm.clientRequests.proposal.note")}
        <Textarea
          value={doc.note}
          onChange={(event) => patch({ note: event.target.value })}
          className="min-h-20 text-[14px]"
        />
      </label>

      <Button
        type="button"
        variant="outline"
        className="h-11 w-full"
        onClick={() => preview(doc)}
      >
        <Download className="h-4 w-4" />
        {t("crm.clientRequests.proposal.preview")}
      </Button>
    </div>
  );
}
