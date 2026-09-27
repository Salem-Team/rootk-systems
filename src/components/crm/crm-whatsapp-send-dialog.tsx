"use client";

import { useEffect, useState } from "react";
import { Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LtrNum } from "@/components/shared/ltr-num";
import { useTranslation } from "@/hooks/use-translation";
import {
  accountsOnEmployee,
  displayWhatsappPhone,
  type WhatsappAccount,
} from "@/lib/whatsapp-accounts";
import { addCrmLeadActivity } from "@/services/crm/crm-activities.service";
import { getEmployeeById } from "@/services/employees.service";
import { getWorkEmployeeId } from "@/stores/session-store";

export function CrmWhatsappSendDialog({
  open,
  onOpenChange,
  targetPhone,
  targetHref,
  leadId,
  leadName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetPhone: string;
  targetHref: string;
  leadId?: string;
  leadName?: string;
}) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [missingEmployee, setMissingEmployee] = useState(false);
  const [accounts, setAccounts] = useState<WhatsappAccount[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const employeeId = getWorkEmployeeId();
    if (!employeeId) {
      setMissingEmployee(true);
      setAccounts([]);
      setLoading(false);
      return;
    }
    setMissingEmployee(false);
    setLoading(true);
    void getEmployeeById(employeeId).then((res) => {
      if (cancelled) return;
      setLoading(false);
      setAccounts(res.success && res.data ? accountsOnEmployee(res.data) : []);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function choose(account: WhatsappAccount) {
    if (!targetHref) return;
    setBusyId(account.id);
    try {
      if (leadId) {
        const name = leadName?.trim() || displayWhatsappPhone(targetPhone);
        const res = await addCrmLeadActivity(leadId, {
          type: "whatsapp",
          title: t("crm.whatsappSend.loggedTitle", { account: account.label }),
          description: t("crm.whatsappSend.loggedDetail", {
            account: account.label,
            name,
          }),
        });
        if (!res.success) {
          toast.error(res.message ?? t("common.error"));
          return;
        }
        toast.success(t("crm.whatsappSend.logged"));
      }
      window.open(targetHref, "_blank", "noopener,noreferrer");
      onOpenChange(false);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>{t("crm.whatsappSend.title")}</DialogTitle>
          <DialogDescription>{t("crm.whatsappSend.description")}</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
          </div>
        ) : missingEmployee ? (
          <p className="text-sm text-muted-foreground">{t("crm.whatsappSend.missingEmployee")}</p>
        ) : accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("crm.whatsappSend.empty")}</p>
        ) : (
          <ul className="grid gap-2">
            {accounts.map((account) => (
              <li key={account.id}>
                <button
                  type="button"
                  disabled={busyId !== null}
                  className="flex w-full items-center gap-3 rounded-xl border border-border/70 bg-card px-3 py-2.5 text-start transition-colors hover:bg-emerald-500/10 disabled:opacity-60"
                  onClick={() => void choose(account)}
                >
                  {busyId === account.id ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                  ) : (
                    <MessageCircle className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{account.label}</span>
                    <LtrNum className="font-mono text-[12px] text-muted-foreground">
                      {displayWhatsappPhone(account.phone)}
                    </LtrNum>
                  </span>
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    {t("crm.whatsappSend.send")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
