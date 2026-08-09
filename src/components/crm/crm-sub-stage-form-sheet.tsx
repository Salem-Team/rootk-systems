"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { SubStageDraft } from "@/hooks/use-crm-stages-panel";

interface CrmSubStageFormSheetProps {
  open: boolean;
  draft: SubStageDraft;
  busy: boolean;
  stageName?: string;
  onOpenChange: (open: boolean) => void;
  onDraftChange: (updater: (draft: SubStageDraft) => SubStageDraft) => void;
  onSave: () => void;
}

/** Create/edit sheet for a nested CRM sub-stage. */
export function CrmSubStageFormSheet({
  open,
  draft,
  busy,
  stageName,
  onOpenChange,
  onDraftChange,
  onSave,
}: CrmSubStageFormSheetProps) {
  const { t } = useTranslation();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            {draft.id ? t("crm.stages.editSub") : t("crm.stages.addSub")}
          </SheetTitle>
          <SheetDescription>
            {stageName
              ? t("crm.stages.subFormDescNamed", { stage: stageName })
              : t("crm.stages.subFormDesc")}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="crm-sub-name">{t("crm.stages.name")}</Label>
            <Input
              id="crm-sub-name"
              value={draft.name}
              onChange={(e) =>
                onDraftChange((d) => ({ ...d, name: e.target.value }))
              }
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="crm-sub-desc">
              {t("crm.stages.descriptionField")}
            </Label>
            <Textarea
              id="crm-sub-desc"
              value={draft.description}
              onChange={(e) =>
                onDraftChange((d) => ({ ...d, description: e.target.value }))
              }
              rows={2}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2.5">
            <Label htmlFor="crm-sub-active">{t("crm.stages.active")}</Label>
            <Switch
              id="crm-sub-active"
              checked={draft.active}
              onCheckedChange={(v) =>
                onDraftChange((d) => ({ ...d, active: v }))
              }
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
