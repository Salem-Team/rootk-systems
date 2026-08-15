"use client";

import { useState } from "react";
import { ContactRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
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
import { pickPhoneContact } from "@/lib/native/contacts";
import { isNativeApp } from "@/lib/native/platform";
import { displayCrmPhone } from "@/lib/crm/phone-links";
import { matchCrmLeadByPhone } from "@/services/crm.service";
import { crmUserFacingMessage } from "@/lib/crm/client-error";
import { canCrm } from "@/lib/crm-policies";
import { useSessionStore } from "@/stores/session-store";
import type { PickedPhoneContact } from "@/lib/native/contacts";

interface CrmPhoneContactImportProps {
  onOpenLead: (leadId: string) => void;
  onCreate: (draft: { name: string; phone: string }) => void;
}

/** Capacitor contact picker — selected contact only, never the full address book. */
export function CrmPhoneContactImport({
  onOpenLead,
  onCreate,
}: CrmPhoneContactImportProps) {
  const { t } = useTranslation();
  const role = useSessionStore((s) => s.role);
  const permissions = useSessionStore((s) =>
    s.authenticated ? s.permissions : undefined
  );
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<PickedPhoneContact | null>(null);

  if (!isNativeApp() || !canCrm(role, "create", permissions)) return null;

  async function pick() {
    setBusy(true);
    const result = await pickPhoneContact();
    setBusy(false);
    if (!result.ok) {
      if (result.reason === "cancelled") return;
      if (result.reason === "denied") {
        toast.error(t("crm.contacts.denied"));
        return;
      }
      if (result.reason === "no_phone") {
        toast.error(t("crm.contacts.noPhone"));
        return;
      }
      toast.error(t("crm.contacts.unavailable"));
      return;
    }
    if (!result.contact.phoneNormalized) {
      toast.error(t("crm.phone.invalid"));
      return;
    }
    const match = await matchCrmLeadByPhone(result.contact.phone);
    if (!match.success) {
      toast.error(crmUserFacingMessage(match, t, "crm.errors.offline"));
      return;
    }
    if (match.data?.lead) {
      onOpenLead(match.data.lead.id);
      toast.message(t("crm.contacts.existing"));
      return;
    }
    if (match.data?.ownedByOther) {
      toast.error(t("crm.duplicate.ownedByOther"));
      return;
    }
    setConfirm(result.contact);
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="min-h-11"
        onClick={() => void pick()}
        disabled={busy}
        aria-busy={busy}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ContactRound className="h-4 w-4" />}
        {t("crm.contacts.import")}
      </Button>
      <Dialog open={Boolean(confirm)} onOpenChange={(open) => !open && setConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("crm.contacts.confirmTitle")}</DialogTitle>
            <DialogDescription>{t("crm.contacts.confirmDesc")}</DialogDescription>
          </DialogHeader>
          {confirm ? (
            <div className="rounded-xl border border-border/60 px-3 py-2.5 text-[13px]">
              <p className="font-semibold">{confirm.name || t("crm.contacts.unnamed")}</p>
              <p className="mt-1 font-mono tabular-nums">
                {displayCrmPhone(confirm.phone, confirm.phoneNormalized)}
              </p>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>
              {t("crm.actions.cancel")}
            </Button>
            <Button
              onClick={() => {
                if (!confirm) return;
                onCreate({ name: confirm.name, phone: confirm.phone });
                setConfirm(null);
              }}
            >
              {t("crm.contacts.createLead")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
