"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/hooks/use-translation";
import { COLOR_SWATCHES, type StageDraft } from "@/hooks/use-crm-stages-panel";
import type { CrmStageCategory } from "@/types/crm";

const CATEGORIES: CrmStageCategory[] = ["open", "won", "lost", "other"];

interface CrmStageFormSheetProps {
  open: boolean;
  draft: StageDraft;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onDraftChange: (updater: (draft: StageDraft) => StageDraft) => void;
  onSave: () => void;
}

/** Create/edit sheet form for a single CRM stage. */
export function CrmStageFormSheet({
  open,
  draft,
  busy,
  onOpenChange,
  onDraftChange,
  onSave,
}: CrmStageFormSheetProps) {
  const { t } = useTranslation();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            {draft.id ? t("crm.stages.edit") : t("crm.stages.add")}
          </SheetTitle>
          <SheetDescription>{t("crm.stages.formDesc")}</SheetDescription>
        </SheetHeader>
        <div className="mt-6 grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="crm-stage-name">{t("crm.stages.name")}</Label>
            <Input
              id="crm-stage-name"
              value={draft.name}
              onChange={(e) => onDraftChange((d) => ({ ...d, name: e.target.value }))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="crm-stage-desc">
              {t("crm.stages.descriptionField")}
            </Label>
            <Textarea
              id="crm-stage-desc"
              value={draft.description}
              onChange={(e) =>
                onDraftChange((d) => ({ ...d, description: e.target.value }))
              }
              rows={2}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>{t("crm.stages.color")}</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onDraftChange((d) => ({ ...d, color: c }))}
                  className="h-7 w-7 rounded-full border-2"
                  style={{
                    backgroundColor: c,
                    borderColor:
                      draft.color === c ? "var(--foreground)" : "transparent",
                  }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>{t("crm.stages.category")}</Label>
            <Select
              value={draft.category}
              onValueChange={(v) =>
                onDraftChange((d) => ({
                  ...d,
                  category: v as CrmStageCategory,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {t(`crm.stageCategory.${c}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="crm-stage-prob">{t("crm.stages.probability")}</Label>
            <Input
              id="crm-stage-prob"
              type="number"
              min={0}
              max={100}
              value={draft.conversionProbability ?? ""}
              onChange={(e) =>
                onDraftChange((d) => ({
                  ...d,
                  conversionProbability:
                    e.target.value === "" ? null : Number(e.target.value),
                }))
              }
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2.5">
            <Label htmlFor="crm-stage-active">{t("crm.stages.active")}</Label>
            <Switch
              id="crm-stage-active"
              checked={draft.active}
              onCheckedChange={(v) => onDraftChange((d) => ({ ...d, active: v }))}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("crm.actions.cancel")}
            </Button>
            <Button type="button" disabled={busy} onClick={onSave}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("crm.actions.save")}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
