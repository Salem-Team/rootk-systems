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
import {
  readLastWhatsappAccountId,
  whatsappHref,
  writeLastWhatsappAccountId,
} from "@/lib/crm/phone-links";
import {
  accountsOnEmployee,
  displayWhatsappPhone,
  type WhatsappAccount,
} from "@/lib/whatsapp-accounts";
import { addCrmLeadActivity } from "@/services/crm/crm-activities.service";
import { getEmployeeById } from "@/services/employees.service";
import { getWorkEmployeeId } from "@/stores/session-store";

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
      setSelectedId(ordered.length === 1 ? ordered[0]!.id : ordered[0]?.id ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const selected = useMemo(
    () => accounts.find((row) => row.id === selectedId) ?? null,
    [accounts, selectedId]
  );

  const chatHref = useMemo(() => {
    return whatsappHref(targetPhone) || targetHref || "";
  }, [targetHref, targetPhone]);

  async function sendFromSelected() {
    if (!selected || !chatHref) return;
    setBusy(true);
    try {
      writeLastWhatsappAccountId(selected.id);
      if (leadId) {
        const name = leadName?.trim() || displayWhatsappPhone(targetPhone);
        const fromPhone = displayWhatsappPhone(selected.phone);
        const res = await addCrmLeadActivity(leadId, {
          type: "whatsapp",
          title: t("crm.whatsappSend.loggedTitle", { account: selected.label }),
          description: t("crm.whatsappSend.loggedDetail", {
            account: selected.label,
            fromPhone,
            name,
          }),
        });
        if (!res.success) {
          toast.error(res.message ?? t("common.error"));
          return;
        }
        toast.success(t("crm.whatsappSend.logged"));
      }
      window.open(chatHref, "_blank", "noopener,noreferrer");
      onOpenChange(false);
    } finally {
      setBusy(false);
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
          <p className="text-sm text-muted-foreground">
            {t("crm.whatsappSend.missingEmployee")}
          </p>
        ) : accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("crm.whatsappSend.empty")}</p>
        ) : (
          <div className="grid gap-3">
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              {t("crm.whatsappSend.fromHint")}
            </p>
            <ul className="grid gap-2">
              {accounts.map((account) => {
                const active = account.id === selected?.id;
                return (
                  <li key={account.id}>
                    <button
                      type="button"
                      disabled={busy}
                      aria-pressed={active}
                      className={
                        active
                          ? "flex w-full items-center gap-3 rounded-xl border border-emerald-500/50 bg-emerald-500/10 px-3 py-2.5 text-start transition-colors disabled:opacity-60"
                          : "flex w-full items-center gap-3 rounded-xl border border-border/70 bg-card px-3 py-2.5 text-start transition-colors hover:bg-muted/40 disabled:opacity-60"
                      }
                      onClick={() => setSelectedId(account.id)}
                    >
                      <MessageCircle
                        className={
                          active
                            ? "h-4 w-4 shrink-0 text-emerald-600"
                            : "h-4 w-4 shrink-0 text-muted-foreground"
                        }
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                          {account.label}
                        </span>
                        <LtrNum className="font-mono text-[12px] text-muted-foreground">
                          {displayWhatsappPhone(account.phone)}
                        </LtrNum>
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

            {selected ? (
              <div className="rounded-xl border border-border/70 bg-muted/25 px-3 py-2.5">
                <p className="text-[11px] font-medium text-muted-foreground">
                  {t("crm.whatsappSend.sendingFrom")}
                </p>
                <p className="mt-0.5 truncate text-sm font-semibold">{selected.label}</p>
                <LtrNum className="font-mono text-[13px] tabular-nums">
                  {displayWhatsappPhone(selected.phone)}
                </LtrNum>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                  {t("crm.whatsappSend.deviceHint")}
                </p>
              </div>
            ) : null}

            <Button
              type="button"
              className="h-11 w-full rounded-xl"
              disabled={!selected || !chatHref || busy}
              onClick={() => void sendFromSelected()}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <MessageCircle className="h-4 w-4" aria-hidden />
              )}
              {t("crm.whatsappSend.openChat")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
