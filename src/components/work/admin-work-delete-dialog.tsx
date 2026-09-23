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
import { useTranslation } from "@/hooks/use-translation";

export function AdminWorkDeleteDialog({
  target,
  busy,
  onOpenChange,
  onConfirm,
}: {
  target: {
    kind: "task" | "meeting" | "project";
    id: string;
    title: string;
  } | null;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("workAdmin.confirmDeleteTitle")}</DialogTitle>
          <DialogDescription>
            {t("workAdmin.confirmDeleteBody", {
              title: target?.title ?? "",
            })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 px-0 pb-[max(0.25rem,env(safe-area-inset-bottom))] sm:pb-0">
          <Button
            type="button"
            variant="outline"
            className="h-11 touch-manipulation rounded-xl sm:h-9 sm:rounded-lg"
            onClick={() => onOpenChange(false)}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="h-11 touch-manipulation rounded-xl sm:h-9 sm:rounded-lg"
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? <Loader2 className="animate-spin" /> : null}
            {t("common.delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
