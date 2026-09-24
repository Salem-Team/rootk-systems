"use client";

import { Phone } from "lucide-react";
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
import { useTranslation } from "@/hooks/use-translation";
import { BidiText } from "@/components/shared/bidi-text";
import { displayCrmPhone } from "@/lib/crm/phone-links";
import type { CrmLead } from "@/types/crm";

interface CrmIncomingCallDialogProps {
  lead: CrmLead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenLead: (leadId: string) => void;
}

function shown(value: string, empty: string) {
  const text = value.trim();
  return text || empty;
}

/** In-app fallback when the call-screen card cannot draw over other apps. */
export function CrmIncomingCallDialog({
  lead,
  open,
  onOpenChange,
  onOpenLead,
}: CrmIncomingCallDialogProps) {
  const { t } = useTranslation();
  const empty = t("crm.call.incoming.empty");

  return (
    <Dialog open={open && Boolean(lead)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            {t("crm.call.incoming.title")}
          </DialogTitle>
          <DialogDescription>{lead?.name}</DialogDescription>
        </DialogHeader>
        {lead ? (
          <DialogBody className="space-y-3">
            <p className="text-sm text-muted-foreground" dir="ltr">
              {displayCrmPhone(lead.phone, lead.phoneNormalized)}
            </p>
            {lead.companyName.trim() ? (
              <p className="text-sm text-foreground">{lead.companyName}</p>
            ) : null}
            <div className="rounded-xl bg-muted/70 px-3 py-2">
              <p className="text-xs text-muted-foreground">
                {t("crm.call.incoming.request")}
              </p>
              <p className="mt-1 text-sm font-medium leading-relaxed">
                {shown(lead.request, empty)}
              </p>
            </div>
            <div className="rounded-xl bg-primary/10 px-3 py-2">
              <p className="text-xs text-muted-foreground">
                {t("crm.call.incoming.budget")}
              </p>
              <p className="mt-1 text-base font-semibold">
                <BidiText text={shown(lead.budget, empty)} />
              </p>
            </div>
          </DialogBody>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("crm.call.incoming.hide")}
          </Button>
          <Button
            disabled={!lead}
            onClick={() => {
              if (lead) onOpenLead(lead.id);
            }}
          >
            {t("crm.call.incoming.open")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
