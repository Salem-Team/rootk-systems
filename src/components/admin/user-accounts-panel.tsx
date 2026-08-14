"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  Copy,
  KeyRound,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableHeaderRow,
  DataTableRow,
} from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import {
  hasPermissionId,
  type PermissionId,
} from "@/constants/permissions";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp } from "@/lib/animations";
import {
  getUserAccounts,
  setUserLoginPassword,
} from "@/services/user.service";
import { useSessionStore } from "@/stores/session-store";
import type { AppUser, UserLoginAccount } from "@/types";

function accountName(user: AppUser) {
  return user.displayName?.trim() || user.email;
}

function generateTempPassword(): string {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

/** Admin: list login accounts with last admin-set password visible. */
export function UserAccountsPanel() {
  const { t } = useTranslation();
  const permissions = useSessionStore((s) => s.permissions);
  const role = useSessionStore((s) => s.role);
  const canReset = hasPermissionId(
    "employees.resetPassword" as PermissionId,
    permissions,
    role
  );

  const [rows, setRows] = useState<UserLoginAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const load = useCallback(
    async (opts?: { soft?: boolean }) => {
      if (opts?.soft) setRefreshing(true);
      else setLoading(true);
      const res = await getUserAccounts();
      if (res.success) setRows(res.data);
      else toast.error(res.message || t("admin.accountsLoadFailed"));
      setLoading(false);
      setRefreshing(false);
    },
    [t]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const name = accountName(row).toLowerCase();
      return (
        row.email.toLowerCase().includes(q) ||
        name.includes(q) ||
        row.role.toLowerCase().includes(q)
      );
    });
  }, [query, rows]);

  async function handleCopy(key: string, value: string) {
    try {
      await copyText(value);
      setCopiedKey(key);
      toast.success(t("admin.accountsCopied"));
      window.setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 1600);
    } catch {
      toast.error(t("common.tryAgain"));
    }
  }

  async function handleReset(row: UserLoginAccount) {
    if (!canReset) return;
    const next = generateTempPassword();
    setBusyId(row.id);
    const res = await setUserLoginPassword(row.id, next);
    setBusyId(null);
    if (!res.success || !res.data) {
      toast.error(res.message || t("common.tryAgain"));
      return;
    }
    setRows((prev) =>
      prev.map((item) => (item.id === row.id ? res.data! : item))
    );
    toast.success(t("admin.accountsPasswordReset"));
    try {
      await copyText(next);
      setCopiedKey(`${row.id}:password`);
    } catch {
      /* ignore clipboard failure after successful reset */
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <motion.section
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      className="surface-panel overflow-hidden"
    >
      <div className="panel-header flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-[0.95rem] font-semibold">
            <KeyRound className="h-3.5 w-3.5 text-primary" aria-hidden />
            {t("admin.accountsTitle")}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t("admin.accountsDesc")}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void load({ soft: true })}
          disabled={refreshing}
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
            aria-hidden
          />
          {t("common.refresh")}
        </Button>
      </div>

      <div className="border-b border-border/60 px-4 py-3 sm:px-5">
        <div className="relative max-w-md">
          <Search
            className="pointer-events-none absolute start-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("admin.accountsSearch")}
            className="ps-9"
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {t("admin.accountsHint")}
        </p>
      </div>

      <div className="overflow-x-auto">
        <DataTable>
          <DataTableHeader>
            <DataTableHeaderRow>
              <DataTableHead>{t("common.name")}</DataTableHead>
              <DataTableHead>{t("common.email")}</DataTableHead>
              <DataTableHead>{t("admin.accountsRole")}</DataTableHead>
              <DataTableHead>{t("admin.accountsPassword")}</DataTableHead>
              <DataTableHead>{t("common.status")}</DataTableHead>
              <DataTableHead className="text-end">
                {t("common.actions")}
              </DataTableHead>
            </DataTableHeaderRow>
          </DataTableHeader>
          <DataTableBody>
            {filtered.length === 0 ? (
              <DataTableRow>
                <DataTableCell
                  colSpan={6}
                  className="py-10 text-center text-muted-foreground"
                >
                  {t("admin.accountsEmpty")}
                </DataTableCell>
              </DataTableRow>
            ) : (
              filtered.map((row) => {
                const name = accountName(row);
                const password = row.loginPassword;
                const emailCopyKey = `${row.id}:email`;
                const passwordCopyKey = `${row.id}:password`;
                return (
                  <DataTableRow key={row.id}>
                    <DataTableCell>
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[11px] font-semibold text-primary">
                          {row.initials}
                        </span>
                        <span className="font-medium">{name}</span>
                      </div>
                    </DataTableCell>
                    <DataTableCell>
                      <div className="flex items-center gap-1.5">
                        <code className="rounded bg-muted/60 px-1.5 py-0.5 text-[12px]">
                          {row.email}
                        </code>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() =>
                            void handleCopy(emailCopyKey, row.email)
                          }
                          aria-label={t("admin.accountsCopyEmail")}
                        >
                          {copiedKey === emailCopyKey ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </DataTableCell>
                    <DataTableCell>
                      <Badge variant="secondary">
                        {row.role === "admin"
                          ? t("roles.admin")
                          : t("roles.employee")}
                      </Badge>
                    </DataTableCell>
                    <DataTableCell>
                      {password ? (
                        <div className="flex items-center gap-1.5">
                          <code className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-[12px] tracking-wide">
                            {password}
                          </code>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() =>
                              void handleCopy(passwordCopyKey, password)
                            }
                            aria-label={t("admin.accountsCopyPassword")}
                          >
                            {copiedKey === passwordCopyKey ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {t("admin.accountsPasswordUnknown")}
                        </span>
                      )}
                    </DataTableCell>
                    <DataTableCell>
                      <Badge variant={row.isActive ? "success" : "outline"}>
                        {row.isActive
                          ? t("common.active")
                          : t("common.inactive")}
                      </Badge>
                    </DataTableCell>
                    <DataTableCell className="text-end">
                      {canReset ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busyId === row.id}
                          onClick={() => void handleReset(row)}
                        >
                          {busyId === row.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <KeyRound className="h-3.5 w-3.5" />
                          )}
                          {t("admin.accountsResetPassword")}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </DataTableCell>
                  </DataTableRow>
                );
              })
            )}
          </DataTableBody>
        </DataTable>
      </div>
    </motion.section>
  );
}
