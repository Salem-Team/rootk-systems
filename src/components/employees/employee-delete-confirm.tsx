"use client";

import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "@/hooks/use-translation";

export function EmployeeDeleteConfirmDialog({
  open,
  employeeName,
  deleting,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  employeeName: string;
  deleting?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[70] sm:max-w-md" overlayClassName="z-[70]">
        <DialogHeader>
          <DialogTitle>{t("employees.confirmDeleteTitle")}</DialogTitle>
          <DialogDescription>
            {t("employees.confirmDeleteBody", { name: employeeName })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={deleting}
            onClick={() => onOpenChange(false)}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={deleting}
            onClick={onConfirm}
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {t("employees.confirmDeleteCta")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
