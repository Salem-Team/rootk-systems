"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Section } from "@/components/employees/employee-profile-info-row";
import { LtrNum } from "@/components/shared/ltr-num";
import { hasPermissionId } from "@/constants/permissions";
import { useTranslation } from "@/hooks/use-translation";
import { createId } from "@/lib/id";
import {
  MAX_WHATSAPP_ACCOUNTS,
  accountsOnEmployee,
  displayWhatsappPhone,
  parseWhatsappAccountsInput,
  type WhatsappAccount,
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
          <ul className="grid gap-2">
            {rows.map((row) => (
              <li key={row.id} className="flex items-start gap-2">
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
                      className="max-w-[11rem] font-mono"
                      onChange={(event) =>
                        updateRow(row.id, { phone: event.target.value })
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t("employees.whatsappRemove")}
                      onClick={() =>
                        setRows((current) => current.filter((item) => item.id !== row.id))
                      }
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  </>
                ) : (
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-3 py-1">
                    <span className="truncate text-sm font-medium">{row.label}</span>
                    <LtrNum className="font-mono text-sm">{row.phone}</LtrNum>
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
                  { id: createId("wa"), label: "", phone: "" },
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
