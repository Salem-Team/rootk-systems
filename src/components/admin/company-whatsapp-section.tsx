"use client";

import { useEffect, useState } from "react";
import { Building2, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LtrNum } from "@/components/shared/ltr-num";
import { useTranslation } from "@/hooks/use-translation";
import { createId } from "@/lib/id";
import {
  MAX_WHATSAPP_ACCOUNTS,
  accountsOnCompany,
  displayWhatsappPhone,
  normalizeWhatsappClientApp,
  parseWhatsappAccountsInput,
  type WhatsappAccount,
  type WhatsappClientApp,
} from "@/lib/whatsapp-accounts";
import { useSettingsStore } from "@/stores/settings-store";
import type { CompanySettings } from "@/types";

function draftFrom(settings: CompanySettings): WhatsappAccount[] {
  return accountsOnCompany(settings).map((account) => ({
    ...account,
    phone: displayWhatsappPhone(account.phone),
    app: normalizeWhatsappClientApp(account.app),
  }));
}

/** Admin: company WhatsApp lines used as CRM send-from options. */
export function CompanyWhatsappSection({
  form,
  onChange,
}: {
  form: CompanySettings;
  onChange: <K extends keyof CompanySettings>(
    key: K,
    value: CompanySettings[K]
  ) => void;
}) {
  const { t } = useTranslation();
  const saveSettings = useSettingsStore((s) => s.saveSettings);
  const [rows, setRows] = useState<WhatsappAccount[]>(() => draftFrom(form));
  const [saving, setSaving] = useState(false);

  const savedKey = JSON.stringify(accountsOnCompany(form));
  useEffect(() => {
    setRows(draftFrom(form));
  }, [form, savedKey]);

  function updateRow(id: string, patch: Partial<WhatsappAccount>) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );
  }

  async function save() {
    const parsed = parseWhatsappAccountsInput({ accounts: rows });
    if (!parsed.ok) {
      toast.error(t("employees.whatsappInvalid"));
      return;
    }
    setSaving(true);
    try {
      const ok = await saveSettings({ whatsappAccounts: parsed.accounts });
      if (!ok) {
        toast.error(t("common.error"));
        return;
      }
      onChange("whatsappAccounts", parsed.accounts);
      toast.success(t("admin.companyWhatsappSaved"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="surface-panel overflow-hidden">
      <div className="panel-header">
        <h3 className="flex items-center gap-2 text-[0.95rem] font-semibold">
          <span className="icon-well h-7 w-7 shrink-0">
            <Building2 className="h-3.5 w-3.5" aria-hidden />
          </span>
          {t("admin.companyWhatsapp")}
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {t("admin.companyWhatsappDesc")}
        </p>
      </div>
      <div className="panel-body space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("admin.companyWhatsappEmpty")}
          </p>
        ) : (
          <ul className="grid gap-2.5">
            {rows.map((row) => (
              <li
                key={row.id}
                className="rounded-xl border border-border/70 bg-card/60 p-3 sm:border-0 sm:bg-transparent sm:p-0"
              >
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_9.5rem_8.5rem_auto] sm:items-center">
                  <Input
                    value={row.label}
                    placeholder={t("admin.companyWhatsappLabelPlaceholder")}
                    aria-label={t("employees.whatsappLabel")}
                    maxLength={80}
                    className="min-h-11 touch-manipulation sm:min-h-10"
                    onChange={(event) =>
                      updateRow(row.id, { label: event.target.value })
                    }
                  />
                  <Input
                    type="tel"
                    inputMode="tel"
                    value={row.phone}
                    placeholder="01xxxxxxxxx"
                    aria-label={t("employees.whatsappPhone")}
                    className="min-h-11 touch-manipulation font-mono sm:min-h-10"
                    onChange={(event) =>
                      updateRow(row.id, { phone: event.target.value })
                    }
                  />
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:contents">
                    <Select
                      value={normalizeWhatsappClientApp(row.app)}
                      onValueChange={(value) =>
                        updateRow(row.id, {
                          app: value as WhatsappClientApp,
                        })
                      }
                    >
                      <SelectTrigger
                        aria-label={t("employees.whatsappApp")}
                        className="min-h-11 touch-manipulation sm:min-h-10"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="whatsapp">
                          {t("employees.whatsappAppPersonal")}
                        </SelectItem>
                        <SelectItem value="business">
                          {t("employees.whatsappAppBusiness")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 shrink-0 touch-manipulation sm:h-9 sm:w-9"
                      aria-label={t("employees.whatsappRemove")}
                      onClick={() =>
                        setRows((current) =>
                          current.filter((item) => item.id !== row.id)
                        )
                      }
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  </div>
                </div>
                <p className="mt-1.5 hidden text-[11px] text-muted-foreground sm:block">
                  <LtrNum>{displayWhatsappPhone(row.phone) || "—"}</LtrNum>
                </p>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11 w-full touch-manipulation sm:min-h-9 sm:w-auto"
            disabled={rows.length >= MAX_WHATSAPP_ACCOUNTS}
            onClick={() =>
              setRows((current) => [
                ...current,
                {
                  id: createId("wa"),
                  label: t("admin.companyWhatsappDefaultLabel"),
                  phone: "",
                  app: "business",
                },
              ])
            }
          >
            <Plus aria-hidden />
            {t("admin.companyWhatsappAdd")}
          </Button>
          <Button
            type="button"
            size="sm"
            className="min-h-11 w-full touch-manipulation sm:min-h-9 sm:w-auto"
            disabled={saving}
            onClick={() => void save()}
          >
            {saving ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {t("admin.companyWhatsappSave")}
          </Button>
        </div>
      </div>
    </section>
  );
}
