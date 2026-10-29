"use client";

import { useEffect, useState } from "react";
import { Loader2, MessageCircle, Plus, Trash2 } from "lucide-react";
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
import { Section } from "@/components/employees/employee-profile-info-row";
import { LtrNum } from "@/components/shared/ltr-num";
import { hasPermissionId } from "@/constants/permissions";
import { useTranslation } from "@/hooks/use-translation";
import { createId } from "@/lib/id";
import { cn } from "@/lib/utils";
import {
  MAX_WHATSAPP_ACCOUNTS,
  accountsOnEmployee,
  displayWhatsappPhone,
  normalizeWhatsappClientApp,
  parseWhatsappAccountsInput,
  type WhatsappAccount,
  type WhatsappClientApp,
} from "@/lib/whatsapp-accounts";
import { updateEmployeeWhatsappAccounts } from "@/services/employees.service";
import {
  getWorkEmployeeIdFromUser,
  useSessionStore,
} from "@/stores/session-store";
import type { Employee } from "@/types";

function draftFrom(employee: Employee): WhatsappAccount[] {
  return accountsOnEmployee(employee).map((account) => ({
    ...account,
    phone: displayWhatsappPhone(account.phone),
    app: normalizeWhatsappClientApp(account.app),
  }));
}

export function EmployeeWhatsappSettings({
  employee,
  onSaved,
  variant = "section",
}: {
  employee: Employee;
  onSaved?: (employee: Employee) => void;
  /** `panel` matches profile/settings surface chrome on mobile. */
  variant?: "section" | "panel";
}) {
  const { t } = useTranslation();
  const sessionUser = useSessionStore((s) => s.user);
  const permissions = useSessionStore((s) => s.permissions);
  const role = useSessionStore((s) => s.role);
  const [rows, setRows] = useState<WhatsappAccount[]>(() => draftFrom(employee));
  const [saving, setSaving] = useState(false);

  const savedKey = JSON.stringify(accountsOnEmployee(employee));
  useEffect(() => {
    setRows(draftFrom(employee));
  }, [employee, savedKey]);

  const isSelf = employee.id === getWorkEmployeeIdFromUser(sessionUser);
  const canEdit =
    isSelf || hasPermissionId("employees.edit", permissions, role);

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
      const res = await updateEmployeeWhatsappAccounts(employee.id, parsed.accounts);
      if (!res.success || !res.data?.id) {
        toast.error(res.message ?? t("common.error"));
        return;
      }
      toast.success(t("employees.whatsappSaved"));
      onSaved?.(res.data);
    } finally {
      setSaving(false);
    }
  }

  const body = (
    <div
      className={cn(
        "space-y-3",
        variant === "section" &&
          "rounded-xl border border-border bg-muted/20 px-3 py-3.5 sm:px-3.5"
      )}
    >
      <p className="text-xs leading-relaxed text-muted-foreground">
        {t("employees.whatsappAccountsDesc")}
      </p>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("employees.whatsappEmpty")}</p>
      ) : (
        <ul className="grid gap-2.5">
          {rows.map((row) => (
            <li
              key={row.id}
              className="rounded-xl border border-border/70 bg-card/60 p-3 sm:border-0 sm:bg-transparent sm:p-0"
            >
              {canEdit ? (
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_9.5rem_8.5rem_auto] sm:items-center">
                  <Input
                    value={row.label}
                    placeholder={t("employees.whatsappLabelPlaceholder")}
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
              ) : (
                <div className="flex min-w-0 flex-col gap-1.5 py-0.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
                  <span className="truncate text-sm font-medium">{row.label}</span>
                  <LtrNum className="font-mono text-sm">{row.phone}</LtrNum>
                  <span className="text-xs text-muted-foreground">
                    {t(
                      normalizeWhatsappClientApp(row.app) === "business"
                        ? "employees.whatsappAppBusiness"
                        : "employees.whatsappAppPersonal"
                    )}
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit ? (
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
                  label: "",
                  phone: "",
                  app: "whatsapp",
                },
              ])
            }
          >
            <Plus aria-hidden />
            {t("employees.whatsappAdd")}
          </Button>
          <Button
            type="button"
            size="sm"
            className="min-h-11 w-full touch-manipulation sm:min-h-9 sm:w-auto"
            disabled={saving}
            onClick={() => void save()}
          >
            {saving ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {t("employees.whatsappSave")}
          </Button>
        </div>
      ) : null}
    </div>
  );

  if (variant === "panel") {
    return (
      <section className="surface-panel overflow-hidden">
        <div className="panel-header">
          <h3 className="flex items-center gap-2 text-[0.95rem] font-semibold">
            <span className="icon-well h-7 w-7 shrink-0">
              <MessageCircle className="h-3.5 w-3.5" aria-hidden />
            </span>
            {t("employees.whatsappAccounts")}
          </h3>
        </div>
        <div className="panel-body">{body}</div>
      </section>
    );
  }

  return <Section title={t("employees.whatsappAccounts")}>{body}</Section>;
}
