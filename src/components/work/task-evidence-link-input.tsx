"use client";

import type { KeyboardEvent } from "react";
import { ExternalLink, Link2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/hooks/use-translation";
import { EVIDENCE_LINKS_MAX, evidenceLinkLabel } from "@/lib/task-evidence";
import { cn } from "@/lib/utils";

export function TaskEvidenceLinkInput({
  links,
  onRemoveLink,
  linkDraft,
  onLinkDraftChange,
  onKeyDown,
  onAddLink,
  linkError,
  requireLinks,
  showInvalid,
}: {
  links: string[];
  onRemoveLink: (link: string) => void;
  linkDraft: string;
  onLinkDraftChange: (value: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  onAddLink: () => void;
  linkError: string | null;
  requireLinks: boolean;
  showInvalid: boolean;
}) {
  const { t } = useTranslation();

  return (
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
                onClick={() => onRemoveLink(link)}
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
          onChange={(e) => onLinkDraftChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t("workEvidence.linkInputPlaceholder")}
          className={cn(
            "font-mono text-[13px]",
            (showInvalid || linkError) && "border-destructive"
          )}
          dir="ltr"
          disabled={links.length >= EVIDENCE_LINKS_MAX}
        />
        <Button
          type="button"
          variant="outline"
          className="shrink-0"
          onClick={onAddLink}
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
  );
}
