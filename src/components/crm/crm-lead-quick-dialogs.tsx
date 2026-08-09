"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/hooks/use-translation";
import type { CrmActivityType } from "@/types/crm";

const ACTIVITY_TYPES: CrmActivityType[] = [
  "call",
  "whatsapp",
  "email",
  "meeting",
  "note",
  "follow_up",
  "other",
];

interface CrmLeadActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actType: CrmActivityType;
  onActTypeChange: (type: CrmActivityType) => void;
  actTitle: string;
  onActTitleChange: (title: string) => void;
  actDesc: string;
  onActDescChange: (desc: string) => void;
  saving: boolean;
  onSave: () => void;
}

/** Quick-action dialog for logging a new activity against a lead. */
export function CrmLeadActivityDialog({
  open,
  onOpenChange,
  actType,
  onActTypeChange,
  actTitle,
  onActTitleChange,
  actDesc,
  onActDescChange,
  saving,
  onSave,
}: CrmLeadActivityDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("crm.actions.addActivity")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>{t("crm.leadSheet.activityType")}</Label>
            <Select value={actType} onValueChange={(v) => onActTypeChange(v as CrmActivityType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_TYPES.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="crm-act-title">{t("crm.leadSheet.activityTitle")}</Label>
            <Input
              id="crm-act-title"
              value={actTitle}
              onChange={(e) => onActTitleChange(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="crm-act-desc">{t("crm.leadSheet.activityDesc")}</Label>
            <Textarea
              id="crm-act-desc"
              value={actDesc}
              onChange={(e) => onActDescChange(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("crm.actions.cancel")}
          </Button>
          <Button type="button" disabled={saving || !actTitle.trim()} onClick={onSave}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("crm.actions.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CrmLeadFollowUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  followAt: string;
  onFollowAtChange: (value: string) => void;
  saving: boolean;
  onSave: () => void;
}

/** Quick-action dialog for scheduling a lead's next follow-up. */
export function CrmLeadFollowUpDialog({
  open,
  onOpenChange,
  followAt,
  onFollowAtChange,
  saving,
  onSave,
}: CrmLeadFollowUpDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("crm.actions.scheduleFollowUp")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-1.5">
          <Label htmlFor="crm-follow-at">{t("crm.leadForm.nextFollowUp")}</Label>
          <Input
            id="crm-follow-at"
            type="datetime-local"
            value={followAt}
            onChange={(e) => onFollowAtChange(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("crm.actions.cancel")}
          </Button>
          <Button type="button" disabled={saving || !followAt} onClick={onSave}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("crm.actions.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
