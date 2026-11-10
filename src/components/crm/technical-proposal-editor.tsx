"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Download, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import {
  isQuotationPriceBullet,
  readQuotationPrices,
  writeQuotationPrice,
  type QuotationPriceKey,
} from "@/lib/crm/quotation-prices";
import {
  newProposalSection,
  templateDraftIssue,
} from "@/lib/crm/technical-proposal";
import { downloadTechnicalProposalPdf } from "@/lib/crm/technical-proposal-print";
import type {
  CrmClientRequestKind,
  TechnicalProposalDocument,
} from "@/types/crm";

const QUOTATION_PRICE_INPUTS: {
  key: QuotationPriceKey;
  labelKey: "listedPrice" | "requestedPrice" | "approvedPrice";
  accent?: boolean;
}[] = [
  { key: "listed", labelKey: "listedPrice" },
  { key: "requested", labelKey: "requestedPrice" },
  { key: "approved", labelKey: "approvedPrice", accent: true },
];

function ProposalTextarea({
  value,
  onChange,
  placeholder,
  rows = 4,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }, [value]);

  return (
    <Textarea
      ref={ref}
      value={value}
      placeholder={placeholder}
      rows={rows}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        "min-h-36 resize-none overflow-hidden text-[16px] leading-8",
        className
      )}
    />
  );
}

export function TechnicalProposalEditor({
  kind,
  leadName,
  doc,
  saved,
  canEdit,
  hint,
  saving = false,
  onChange,
  onSave,
  onExported,
}: {
  kind: CrmClientRequestKind;
  leadName: string;
  doc: TechnicalProposalDocument | null;
  saved: TechnicalProposalDocument | null;
  canEdit: boolean;
  hint?: string;
  saving?: boolean;
  onChange?: (next: TechnicalProposalDocument) => void;
  onSave?: () => void;
  onExported?: (doc: TechnicalProposalDocument) => void;
}) {
  const { t } = useTranslation();
  const [downloading, setDownloading] = useState(false);

  function patch(next: Partial<TechnicalProposalDocument>) {
    if (!doc || !onChange) return;
    onChange({ ...doc, ...next });
  }

  async function preview(source: TechnicalProposalDocument) {
    if (downloading) return;
    const issue = templateDraftIssue(source);
    if (issue) {
      toast.error(
        issue === "title"
          ? t("crm.clientRequests.proposal.invalid.title")
          : t("crm.clientRequests.proposal.invalid.section")
      );
      return;
    }
    setDownloading(true);
    try {
      await downloadTechnicalProposalPdf(source, leadName, kind);
      if (kind === "price_exception") onExported?.(source);
    } catch {
      toast.error(t("crm.clientRequests.proposal.popup"));
    } finally {
      setDownloading(false);
    }
  }

  function referenceLine(reference?: string) {
    const value = reference?.trim();
    if (!value) return null;
    return (
      <p className="text-[12px] font-semibold text-primary">
        {t("crm.clientRequests.proposal.reference")}{" "}
        <span dir="ltr">{value}</span>
      </p>
    );
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
      <div className="space-y-2">
        {referenceLine(saved.reference)}
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full"
        disabled={downloading}
        onClick={() => void preview(saved)}
      >
        {downloading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        {t("crm.clientRequests.proposal.download")}
      </Button>
      </div>
    );
  }

  if (!doc) return null;

  const quotationPrices =
    kind === "price_exception" ? readQuotationPrices(doc) : null;

  return (
    <div className="space-y-2.5 rounded-xl border border-primary/20 bg-primary/[0.03] p-2.5">
      <div>
        <p className="text-[13px] font-semibold">
          {t(`crm.clientRequests.templateTitles.${kind}`)}
        </p>
        <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
          {hint ||
            (kind === "price_exception"
              ? t("crm.clientRequests.quotationHint")
              : t("crm.clientRequests.proposal.editHint"))}
        </p>
        {referenceLine(doc.reference)}
      </div>

      {quotationPrices ? (
        <div className="grid gap-2 sm:grid-cols-3">
          {QUOTATION_PRICE_INPUTS.map((field) => (
            <label
              key={field.key}
              className={cn(
                "grid gap-1 rounded-xl border bg-card px-3 py-2 text-[12px] font-medium",
                field.accent ? "border-primary/40" : "border-border/70"
              )}
            >
              {t(`crm.clientRequests.${field.labelKey}`)}
              <Input
                value={quotationPrices[field.key]}
                onChange={(event) =>
                  onChange?.(
                    writeQuotationPrice(doc, field.key, event.target.value)
                  )
                }
                placeholder={t("crm.clientRequests.pricePlaceholder")}
                className="h-11 border-0 bg-transparent px-0 text-[16px] font-semibold shadow-none focus-visible:ring-0"
              />
            </label>
          ))}
        </div>
      ) : null}

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
        <ProposalTextarea
          value={doc.intro}
          onChange={(value) => patch({ intro: value })}
          placeholder={t("crm.clientRequests.proposal.introPlaceholder")}
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
            <ProposalTextarea
              value={section.intro}
              onChange={(value) =>
                patch({
                  sections: doc.sections.map((row) =>
                    row.id === section.id
                      ? { ...row, intro: value }
                      : row
                  ),
                })
              }
              placeholder={t("crm.clientRequests.proposal.sectionIntro")}
              className="min-h-48"
            />
            {section.bullets.map((bullet, bulletIndex) => {
              if (
                kind === "price_exception" &&
                isQuotationPriceBullet(bullet)
              ) {
                return null;
              }
              const editableBullets = section.bullets.filter(
                (item) =>
                  !(kind === "price_exception" && isQuotationPriceBullet(item))
              );
              return (
                <div
                  key={`${section.id}-${bulletIndex}`}
                  className="flex items-start gap-1.5"
                >
                  <ProposalTextarea
                    value={bullet}
                    onChange={(value) =>
                      patch({
                        sections: doc.sections.map((row) =>
                          row.id === section.id
                            ? {
                                ...row,
                                bullets: row.bullets.map((item, itemIndex) =>
                                  itemIndex === bulletIndex ? value : item
                                ),
                              }
                            : row
                        ),
                      })
                    }
                    placeholder={t("crm.clientRequests.proposal.bullet")}
                    rows={2}
                    className="min-h-16 min-w-0 flex-1"
                  />
                  {editableBullets.length > 1 ? (
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
              );
            })}
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
        <ProposalTextarea
          value={doc.note}
          onChange={(value) => patch({ note: value })}
        />
      </label>

      {onSave ? (
        <Button
          type="button"
          className="h-11 w-full"
          disabled={saving}
          onClick={onSave}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : null}
          {t(
            kind === "contract"
              ? "crm.clientRequests.proposal.saveContract"
              : kind === "price_exception"
                ? "crm.clientRequests.proposal.saveQuotation"
                : "crm.clientRequests.proposal.save"
          )}
        </Button>
      ) : null}
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full"
        disabled={downloading}
        onClick={() => void preview(doc)}
      >
        {downloading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        {t("crm.clientRequests.proposal.download")}
      </Button>
    </div>
  );
}
