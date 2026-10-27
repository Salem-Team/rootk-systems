"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LtrNum } from "@/components/shared/ltr-num";
import { useTranslation } from "@/hooks/use-translation";
import { openWhatsappChat } from "@/lib/crm/open-whatsapp";
import {
  readLastWhatsappAccountId,
  writeLastWhatsappAccountId,
} from "@/lib/crm/phone-links";
import {
  accountsOnEmployee,
  displayWhatsappPhone,
  normalizeWhatsappClientApp,
  type WhatsappAccount,
} from "@/lib/whatsapp-accounts";
import { addCrmLeadActivity } from "@/services/crm/crm-activities.service";
import { getEmployeeById } from "@/services/employees.service";
import { getWorkEmployeeId } from "@/stores/session-store";
import { cn } from "@/lib/utils";

function sortAccounts(
  accounts: WhatsappAccount[],
  preferredId: string | null
): WhatsappAccount[] {
  if (!preferredId || accounts.length < 2) return accounts;
  const preferred = accounts.find((row) => row.id === preferredId);
  if (!preferred) return accounts;
  return [preferred, ...accounts.filter((row) => row.id !== preferredId)];
}

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
  /** Fallback chat URL when phone normalize fails. */
  targetHref: string;
  leadId?: string;
  leadName?: string;
}) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [missingEmployee, setMissingEmployee] = useState(false);
  const [accounts, setAccounts] = useState<WhatsappAccount[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setSelectedId(null);
      return;
    }
    let cancelled = false;
    const employeeId = getWorkEmployeeId();
    if (!employeeId) {
      setMissingEmployee(true);
      setAccounts([]);
      setSelectedId(null);
      setLoading(false);
      return;
    }
    setMissingEmployee(false);
    setLoading(true);
    void getEmployeeById(employeeId).then((res) => {
      if (cancelled) return;
      setLoading(false);
      const list =
        res.success && res.data ? accountsOnEmployee(res.data) : [];
      const ordered = sortAccounts(list, readLastWhatsappAccountId());
      setAccounts(ordered);
      setSelectedId(ordered[0]?.id ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const selected = useMemo(
    () => accounts.find((row) => row.id === selectedId) ?? null,
    [accounts, selectedId]
  );

  function sendFromSelected() {
    if (!selected) return;
    const app = normalizeWhatsappClientApp(selected.app);
    // Open first while still inside the user gesture — async logging must not
    // run before navigation or mobile browsers / WebViews block the handoff.
    const opened = openWhatsappChat(targetPhone, app, {
      fallbackHref: targetHref,
    });
    if (!opened.ok) {
      toast.error(
        opened.reason === "invalid_phone"
          ? t("crm.whatsappSend.invalidPhone")
          : t("crm.whatsappSend.openFailed")
      );
      return;
    }

    writeLastWhatsappAccountId(selected.id);
    onOpenChange(false);

    if (!leadId) return;
    setBusy(true);
    const name = leadName?.trim() || displayWhatsappPhone(targetPhone);
    const fromPhone = displayWhatsappPhone(selected.phone);
    void addCrmLeadActivity(leadId, {
      type: "whatsapp",
      title: t("crm.whatsappSend.loggedTitle", { account: selected.label }),
      description: t("crm.whatsappSend.loggedDetail", {
        account: selected.label,
        fromPhone,
        name,
      }),
    })
      .then((res) => {
        if (!res.success) {
          toast.error(res.message ?? t("common.error"));
          return;
        }
        toast.success(t("crm.whatsappSend.logged"));
      })
      .finally(() => setBusy(false));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm gap-4" onClick={(e) => e.stopPropagation()}>
        <DialogHeader className="space-y-1.5">
          <DialogTitle>{t("crm.whatsappSend.title")}</DialogTitle>
          <DialogDescription>{t("crm.whatsappSend.description")}</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
          </div>
        ) : missingEmployee ? (
          <p className="text-sm text-muted-foreground">
            {t("crm.whatsappSend.missingEmployee")}
          </p>
        ) : accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("crm.whatsappSend.empty")}</p>
        ) : (
          <div className="grid gap-3">
            <ul className="grid gap-2">
              {accounts.map((account) => {
                const active = account.id === selected?.id;
                const app = normalizeWhatsappClientApp(account.app);
                return (
                  <li key={account.id}>
                    <button
                      type="button"
                      disabled={busy}
                      aria-pressed={active}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-start transition-colors disabled:opacity-60",
                        active
                          ? "border-emerald-500/55 bg-emerald-500/10"
                          : "border-border/70 bg-card hover:bg-muted/40"
                      )}
                      onClick={() => setSelectedId(account.id)}
                    >
                      <MessageCircle
                        className={cn(
                          "h-4 w-4 shrink-0",
                          active ? "text-emerald-600" : "text-muted-foreground"
                        )}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                          {account.label}
                        </span>
                        <LtrNum className="font-mono text-[12px] text-muted-foreground">
                          {displayWhatsappPhone(account.phone)}
                        </LtrNum>
                        <span className="mt-0.5 block text-[11px] text-muted-foreground">
                          {t(
                            app === "business"
                              ? "crm.whatsappSend.appBusiness"
                              : "crm.whatsappSend.appPersonal"
                          )}
                        </span>
                      </span>
                      {active ? (
                        <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                          {t("crm.whatsappSend.selected")}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>

            <Button
              type="button"
              className="h-12 w-full rounded-xl bg-emerald-600 text-white hover:bg-emerald-600/90"
              disabled={!selected || busy}
              onClick={sendFromSelected}
            >
              <MessageCircle className="h-4 w-4" aria-hidden />
              {t("crm.whatsappSend.openChat")}
            </Button>
            <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
              {t("crm.whatsappSend.openHint")}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
