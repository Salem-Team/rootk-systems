"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
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
import { useTranslation } from "@/hooks/use-translation";
import type { CrmStage } from "@/types/crm";

interface CrmStageDeleteDialogProps {
  deleteId: string | null;
  stages: CrmStage[];
  needsMove: boolean;
  leadCount: number;
  moveToStageId: string;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onMoveToStageChange: (id: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Confirm-delete dialog for a CRM stage, with lead re-assignment when needed. */
export function CrmStageDeleteDialog({
  deleteId,
  stages,
  needsMove,
  leadCount,
  moveToStageId,
  busy,
  onOpenChange,
  onMoveToStageChange,
  onCancel,
  onConfirm,
}: CrmStageDeleteDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={Boolean(deleteId)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {needsMove ? t("crm.stages.moveLeadsTitle") : t("crm.stages.deleteTitle")}
          </DialogTitle>
          <DialogDescription>
            {needsMove
              ? t("crm.stages.moveLeadsDesc", { count: String(leadCount) })
              : t("crm.stages.deleteDesc")}
          </DialogDescription>
        </DialogHeader>
        {needsMove ? (
          <div className="grid gap-1.5">
            <Label>{t("crm.stages.moveTo")}</Label>
            <Select
              value={moveToStageId || undefined}
              onValueChange={onMoveToStageChange}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("crm.leadForm.selectStage")} />
              </SelectTrigger>
              <SelectContent>
                {stages
                  .filter((s) => s.id !== deleteId)
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("crm.actions.cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={busy || (needsMove && !moveToStageId)}
            onClick={onConfirm}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("crm.stages.confirmDelete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
