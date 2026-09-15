"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import type { CrmFeedbackType } from "@/types/crm";

export type CrmLossReasonPayload = {
  lossReasonTypeId: string;
  details: string;
};

interface CrmLossReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lossReasons: CrmFeedbackType[];
  stageName?: string;
  saving?: boolean;
  onConfirm: (payload: CrmLossReasonPayload) => void | Promise<void>;
}

/** Required when moving a lead into a Lost stage — preset reasons + optional details. */
export function CrmLossReasonDialog({
  open,
  onOpenChange,
  lossReasons,
  stageName,
  saving = false,
  onConfirm,
}: CrmLossReasonDialogProps) {
  const { t } = useTranslation();
  const [reasonId, setReasonId] = useState("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState(false);

  const reasons = useMemo(
    () =>
      (Array.isArray(lossReasons) ? lossReasons : [])
        .filter((r) => r.active && r.isLossReason)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [lossReasons]
  );

  useEffect(() => {
    if (!open) return;
    setReasonId("");
    setDetails("");
    setError(false);
  }, [open]);

  async function submit() {
    if (!reasonId) {
      setError(true);
      return;
    }
    await onConfirm({
      lossReasonTypeId: reasonId,
      details: details.trim(),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("crm.lossReason.title")}</DialogTitle>
          <DialogDescription>
            {stageName
              ? t("crm.lossReason.descWithStage", { stage: stageName })
              : t("crm.lossReason.desc")}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="crm-loss-reason">{t("crm.lossReason.select")}</Label>
            <Select
              value={reasonId || undefined}
              onValueChange={(value) => {
                setReasonId(value);
                setError(false);
              }}
              disabled={reasons.length === 0 || saving}
            >
              <SelectTrigger
                id="crm-loss-reason"
                className={error ? "border-destructive" : undefined}
              >
                <SelectValue placeholder={t("crm.lossReason.placeholder")} />
              </SelectTrigger>
              <SelectContent>
                {reasons.map((reason) => (
                  <SelectItem key={reason.id} value={reason.id}>
                    {reason.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error ? (
              <p className="text-[12px] text-destructive">
                {t("crm.lossReason.required")}
              </p>
            ) : null}
            {reasons.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">
                {t("crm.lossReason.empty")}
              </p>
            ) : null}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="crm-loss-details">
              {t("crm.lossReason.details")}
            </Label>
            <Textarea
              id="crm-loss-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={t("crm.lossReason.detailsPlaceholder")}
              disabled={saving}
              className="min-h-[88px]"
            />
          </div>
        </DialogBody>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            disabled={saving || reasons.length === 0}
            onClick={() => void submit()}
          >
            {saving ? (
              <Loader2 className="me-1.5 h-4 w-4 animate-spin" />
            ) : null}
            {t("crm.lossReason.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

