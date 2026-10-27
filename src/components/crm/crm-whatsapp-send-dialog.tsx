"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, MessageCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LtrNum } from "@/components/shared/ltr-num";
import { useTranslation } from "@/hooks/use-translation";
import {
  buildWhatsappOpenUrl,
  openWhatsappChat,
  resolveWhatsappPlatform,
} from "@/lib/crm/open-whatsapp";
import {
  readLastWhatsappAccountId,
  writeLastWhatsappAccountId,
} from "@/lib/crm/phone-links";
import { canUseNativeWhatsappOpen } from "@/lib/native/whatsapp";
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
  const [opening, setOpening] = useState(false);
  const [missingEmployee, setMissingEmployee] = useState(false);
  const [accounts, setAccounts] = useState<WhatsappAccount[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setSelectedId(null);
      setOpening(false);
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

  const platform = useMemo(() => resolveWhatsappPlatform(), [open]);
  const usesNativeHandoff = canUseNativeWhatsappOpen();

  const selectedApp = selected
    ? normalizeWhatsappClientApp(selected.app)
    : "whatsapp";

  const chatHref = useMemo(() => {
    if (!selected) return "";
    return (
      buildWhatsappOpenUrl(targetPhone, selectedApp, { platform }) ||
      targetHref.trim() ||
      ""
    );
  }, [platform, selected, selectedApp, targetHref, targetPhone]);

  async function onOpenChat() {
    if (!selected) {
      toast.error(t("crm.whatsappSend.invalidPhone"));
      return;
    }
    if (opening) return;
    setOpening(true);
    writeLastWhatsappAccountId(selected.id);

    const result = await openWhatsappChat(targetPhone, selectedApp, {
      fallbackHref: targetHref,
    });

    if (!result.ok) {
      setOpening(false);
      toast.error(
        result.reason === "not_installed"
          ? t("crm.whatsappSend.notInstalled")
          : result.reason === "invalid_phone"
            ? t("crm.whatsappSend.invalidPhone")
            : t("crm.whatsappSend.openFailed")
      );
      return;
    }

    if (leadId) {
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
      }).then((res) => {
        if (!res.success) {
          toast.error(res.message ?? t("common.error"));
          return;
        }
        toast.success(t("crm.whatsappSend.logged"));
      });
    }

    // Native / deep-link leaves the document; keep dialog until handoff finishes.
    if (result.via === "web") {
      window.setTimeout(() => onOpenChange(false), 150);
    }
    window.setTimeout(() => setOpening(false), 800);
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
                      aria-pressed={active}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-start transition-colors",
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
                        <span className="mt-0.5 block text-[11px] font-medium text-muted-foreground">
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

            {selected ? (
              <div className="space-y-2 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] px-3 py-2.5">
                <div className="flex items-start gap-2 text-[12px] leading-relaxed text-foreground">
                  <ShieldCheck
                    className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                    aria-hidden
                  />
                  <span>
                    {t("crm.whatsappSend.sendingAs", {
                      label: selected.label,
                      phone: displayWhatsappPhone(selected.phone),
                      app: t(
                        selectedApp === "business"
                          ? "crm.whatsappSend.appBusiness"
                          : "crm.whatsappSend.appPersonal"
                      ),
                    })}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {usesNativeHandoff
                    ? t("crm.whatsappSend.openHintNative")
                    : platform === "web"
                      ? t("crm.whatsappSend.openHintDesktop")
                      : t("crm.whatsappSend.openHint")}
                </p>
              </div>
            ) : null}

            <Button
              type="button"
              disabled={!selected || opening || (!chatHref && !usesNativeHandoff)}
              className="h-12 w-full gap-2 rounded-xl bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-600/90"
              onClick={() => void onOpenChat()}
            >
              {opening ? (
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
