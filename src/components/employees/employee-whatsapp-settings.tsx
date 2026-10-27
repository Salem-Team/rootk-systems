"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
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
}: {
  employee: Employee;
  onSaved?: (employee: Employee) => void;
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

  return (
    <Section title={t("employees.whatsappAccounts")}>
      <div className="space-y-3 rounded-xl border border-border bg-muted/20 px-3.5 py-3.5">
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t("employees.whatsappAccountsDesc")}
        </p>

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("employees.whatsappEmpty")}</p>
        ) : (
          <ul className="grid gap-2.5">
            {rows.map((row) => (
              <li key={row.id} className="grid gap-2 sm:grid-cols-[1fr_9.5rem_8.5rem_auto] sm:items-center">
                {canEdit ? (
                  <>
                    <Input
                      value={row.label}
                      placeholder={t("employees.whatsappLabelPlaceholder")}
                      aria-label={t("employees.whatsappLabel")}
                      maxLength={80}
                      onChange={(event) =>
                        updateRow(row.id, { label: event.target.value })
                      }
                    />
                    <Input
                      type="tel"
                      value={row.phone}
                      placeholder="01xxxxxxxxx"
                      aria-label={t("employees.whatsappPhone")}
                      className="font-mono"
                      onChange={(event) =>
                        updateRow(row.id, { phone: event.target.value })
                      }
                    />
                    <Select
                      value={normalizeWhatsappClientApp(row.app)}
                      onValueChange={(value) =>
                        updateRow(row.id, {
                          app: value as WhatsappClientApp,
                        })
                      }
                    >
                      <SelectTrigger aria-label={t("employees.whatsappApp")}>
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
                      aria-label={t("employees.whatsappRemove")}
                      onClick={() =>
                        setRows((current) =>
                          current.filter((item) => item.id !== row.id)
                        )
                      }
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  </>
                ) : (
                  <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3 py-1 sm:col-span-4">
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
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
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
              disabled={saving}
              onClick={() => void save()}
            >
              {saving ? <Loader2 className="animate-spin" aria-hidden /> : null}
              {t("employees.whatsappSave")}
            </Button>
          </div>
        ) : null}
      </div>
    </Section>
  );
}
