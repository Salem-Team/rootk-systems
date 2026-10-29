"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Building2, Loader2, MessageCircle, ShieldCheck, UserRound } from "lucide-react";
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
  accountsOnCompany,
  accountsOnEmployee,
  displayWhatsappPhone,
  normalizeWhatsappClientApp,
  type WhatsappAccount,
} from "@/lib/whatsapp-accounts";
import { addCrmLeadActivity } from "@/services/crm/crm-activities.service";
import { getEmployeeById } from "@/services/employees.service";
import { getSettings } from "@/services/settings.service";
import { getWorkEmployeeId } from "@/stores/session-store";
import { cn } from "@/lib/utils";

type SendSource = "sales" | "company";

type SendLine = WhatsappAccount & { source: SendSource };

function sortLines(lines: SendLine[], preferredId: string | null): SendLine[] {
  if (!preferredId || lines.length < 2) return lines;
  const preferred = lines.find((row) => row.id === preferredId);
  if (!preferred) return lines;
  return [preferred, ...lines.filter((row) => row.id !== preferredId)];
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
  const [lines, setLines] = useState<SendLine[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setSelectedId(null);
      setOpening(false);
      return;
    }
    let cancelled = false;
    const employeeId = getWorkEmployeeId();
    setMissingEmployee(!employeeId);
    setLoading(true);

    void Promise.all([
      employeeId ? getEmployeeById(employeeId) : Promise.resolve(null),
      getSettings(),
    ]).then(([employeeRes, settingsRes]) => {
      if (cancelled) return;
      setLoading(false);

      const sales: SendLine[] =
        employeeRes && employeeRes.success && employeeRes.data
          ? accountsOnEmployee(employeeRes.data).map((account) => ({
              ...account,
              source: "sales" as const,
            }))
          : [];

      const company: SendLine[] =
        settingsRes.success && settingsRes.data
          ? accountsOnCompany(settingsRes.data).map((account) => ({
              ...account,
              source: "company" as const,
            }))
          : [];

      const ordered = sortLines([...sales, ...company], readLastWhatsappAccountId());
      setLines(ordered);
      setSelectedId(ordered[0]?.id ?? null);
    });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const selected = useMemo(
    () => lines.find((row) => row.id === selectedId) ?? null,
    [lines, selectedId]
  );

  const salesLines = useMemo(
    () => lines.filter((row) => row.source === "sales"),
    [lines]
  );
  const companyLines = useMemo(
    () => lines.filter((row) => row.source === "company"),
    [lines]
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

  async function openWithLine(line: SendLine) {
    if (opening) return;
    setOpening(true);
    setSelectedId(line.id);
    writeLastWhatsappAccountId(line.id);

    const app = normalizeWhatsappClientApp(line.app);

    // Close first so the dialog focus trap cannot swallow the handoff.
    onOpenChange(false);

    const result = await openWhatsappChat(targetPhone, app, {
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

    toast.success(t("crm.whatsappSend.opened"));

    if (leadId) {
      const name = leadName?.trim() || displayWhatsappPhone(targetPhone);
      const fromPhone = displayWhatsappPhone(line.phone);
      const sourceLabel =
        line.source === "company"
          ? t("crm.whatsappSend.sourceCompany")
          : t("crm.whatsappSend.sourceSales");
      void addCrmLeadActivity(leadId, {
        type: "whatsapp",
        title: t("crm.whatsappSend.loggedTitle", { account: line.label }),
        description: t("crm.whatsappSend.loggedDetail", {
          account: `${line.label} · ${sourceLabel}`,
          fromPhone,
          name,
        }),
      }).then((res) => {
        if (!res.success) {
          toast.error(res.message ?? t("common.error"));
        }
      });
    }

    window.setTimeout(() => setOpening(false), 800);
  }

  function renderGroup(
    title: string,
    icon: ReactNode,
    group: SendLine[],
    emptyHint: ReactNode
  ) {
    return (
      <div className="grid gap-2">
        <div className="flex items-center gap-2 px-0.5 text-[12px] font-semibold text-muted-foreground">
          {icon}
          <span>{title}</span>
        </div>
        {group.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 px-3 py-2.5 text-sm text-muted-foreground">
            {emptyHint}
          </div>
        ) : (
          <ul className="grid gap-2">
            {group.map((line) => {
              const active = line.id === selected?.id;
              const app = normalizeWhatsappClientApp(line.app);
              const busy = opening;
              return (
                <li key={`${line.source}-${line.id}`}>
                  <button
                    type="button"
                    aria-pressed={active}
                    disabled={busy}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-start transition-colors",
                      active
                        ? "border-emerald-500/55 bg-emerald-500/10"
                        : "border-border/70 bg-card hover:bg-muted/40",
                      busy && "opacity-60"
                    )}
                    onClick={() => void openWithLine(line)}
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
                        {line.label}
                      </span>
                      <LtrNum className="font-mono text-[12px] text-muted-foreground">
                        {displayWhatsappPhone(line.phone)}
                      </LtrNum>
                      <span className="mt-0.5 block text-[11px] font-medium text-muted-foreground">
                        {t(
                          app === "business"
                            ? "crm.whatsappSend.appBusiness"
                            : "crm.whatsappSend.appPersonal"
                        )}
                      </span>
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                      {busy && active ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      ) : (
                        t("crm.whatsappSend.tapToOpen")
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
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
        ) : missingEmployee && lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("crm.whatsappSend.missingEmployee")}
          </p>
        ) : lines.length === 0 ? (
          <div className="grid gap-3">
            <p className="text-sm text-muted-foreground">{t("crm.whatsappSend.empty")}</p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/profile">{t("crm.whatsappSend.addNumbers")}</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {renderGroup(
              t("crm.whatsappSend.sourceSales"),
              <UserRound className="h-3.5 w-3.5" aria-hidden />,
              salesLines,
              <span className="flex flex-wrap items-center gap-x-1 gap-y-1">
                <span>{t("crm.whatsappSend.emptySales")}</span>
                <Link href="/profile" className="font-medium text-primary underline-offset-2 hover:underline">
                  {t("crm.whatsappSend.addNumbers")}
                </Link>
              </span>
            )}

            {renderGroup(
              t("crm.whatsappSend.sourceCompany"),
              <Building2 className="h-3.5 w-3.5" aria-hidden />,
              companyLines,
              <span>{t("crm.whatsappSend.emptyCompany")}</span>
            )}

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

            {selected && chatHref ? (
              <Button
                type="button"
                disabled={opening}
                className="h-12 w-full gap-2 rounded-xl bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-600/90"
                onClick={() => void openWithLine(selected)}
              >
                {opening ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <MessageCircle className="h-4 w-4" aria-hidden />
                )}
                {t("crm.whatsappSend.openChat")}
              </Button>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
