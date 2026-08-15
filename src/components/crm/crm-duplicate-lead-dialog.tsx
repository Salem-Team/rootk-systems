"use client";

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
import { displayCrmPhone } from "@/lib/crm/phone-links";
import type { CrmDuplicateLeadSummary } from "@/types/crm";

interface CrmDuplicateLeadDialogProps {
  open: boolean;
  ownedByOther?: boolean;
  lead?: CrmDuplicateLeadSummary | null;
  onOpenChange: (open: boolean) => void;
  onOpenLead?: (leadId: string) => void;
}

export function CrmDuplicateLeadDialog({
  open,
  ownedByOther = false,
  lead,
  onOpenChange,
  onOpenLead,
}: CrmDuplicateLeadDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("crm.duplicate.title")}</DialogTitle>
          <DialogDescription>
            {ownedByOther && !lead
              ? t("crm.duplicate.ownedByOther")
              : t("crm.duplicate.desc")}
          </DialogDescription>
        </DialogHeader>
        {lead ? (
          <div className="rounded-xl border border-border/60 px-3 py-2.5 text-[13px]">
            <p className="font-semibold">{lead.name}</p>
            <p className="mt-1 font-mono tabular-nums text-muted-foreground">
              {displayCrmPhone(lead.phone, lead.phoneNormalized)}
            </p>
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="outline" className="min-h-11" onClick={() => onOpenChange(false)}>
            {t("crm.actions.cancel")}
          </Button>
          {lead && onOpenLead ? (
            <Button
              className="min-h-11"
              onClick={() => {
                onOpenChange(false);
                onOpenLead(lead.id);
              }}
            >
              {t("crm.duplicate.open")}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
