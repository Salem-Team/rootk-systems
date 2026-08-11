"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, RotateCcw, Save, Search, Shield } from "lucide-react";
import { toast } from "sonner";
import {
  ALL_PERMISSION_IDS,
  permissionsForRole,
  type PermissionId,
} from "@/constants/permissions";
import {
  getUserPermissions,
  listPermissionUsers,
  updateUserPermissions,
} from "@/services/permissions.service";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp } from "@/lib/animations";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPermissionsEditor } from "@/components/admin/user-permissions-editor";
import type {
  UserPermissionDetail,
  UserPermissionSummary,
} from "@/types/permissions";

export function UserPermissionsPanel() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<UserPermissionSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<UserPermissionDetail | null>(null);
  const [draft, setDraft] = useState<Set<PermissionId>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");

  const loadUsers = useCallback(async () => {
    const res = await listPermissionUsers();
    if (res.success) {
      setUsers(res.data);
      setSelectedId((current) => current ?? res.data[0]?.user.id ?? null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let active = true;
    void (async () => {
      const res = await getUserPermissions(selectedId);
      if (!active) return;
      if (res.success && res.data) {
        setDetail(res.data);
        setDraft(new Set(res.data.effective));
      }
    })();
    return () => {
      active = false;
    };
  }, [selectedId]);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((row) => {
      const name = (row.user.displayName || row.user.email).toLowerCase();
      return name.includes(q) || row.user.email.toLowerCase().includes(q);
    });
  }, [query, users]);

  const defaults = useMemo(
    () => new Set(detail ? permissionsForRole(detail.role) : []),
    [detail]
  );

  const dirty = useMemo(() => {
    if (!detail) return false;
    if (draft.size !== detail.effective.length) return true;
    return detail.effective.some((id) => !draft.has(id));
  }, [detail, draft]);

  function toggle(id: PermissionId, granted: boolean) {
    setDraft((prev) => {
      const next = new Set(prev);
      if (granted) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function handleSave() {
    if (!selectedId || !detail || detail.isProtected) return;
    setSaving(true);
    const res = await updateUserPermissions(selectedId, draft);
    setSaving(false);
    if (!res.success || !res.data) {
      toast.error(res.message || t("errors.saveSettings"));
      return;
    }
    setDetail(res.data);
    setDraft(new Set(res.data.effective));
    toast.success(t("permissions.saved"));
    void loadUsers();
  }

  function resetDefaults() {
    if (!detail) return;
    setDraft(new Set(permissionsForRole(detail.role)));
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
      className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]"
    >
      <div className="surface-panel overflow-hidden">
        <div className="border-b border-border/60 px-3 py-3 sm:px-4">
          <h3 className="flex items-center gap-2 text-[0.95rem] font-semibold">
            <Shield className="h-4 w-4 text-primary" aria-hidden />
            {t("permissions.title")}
          </h3>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {t("permissions.usersHint")}
          </p>
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("permissions.searchUsers")}
              className="ps-8"
            />
          </div>
        </div>
        <ul className="max-h-[70vh] overflow-y-auto p-2">
          {filteredUsers.length === 0 ? (
            <li className="px-3 py-8 text-center text-sm text-muted-foreground">
              {t("permissions.noUsers")}
            </li>
          ) : (
            filteredUsers.map((row) => {
              const active = row.user.id === selectedId;
              const name = row.user.displayName?.trim() || row.user.email;
              return (
                <li key={row.user.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(row.user.id)}
                    className={cn(
                      "flex w-full flex-col rounded-lg px-3 py-2 text-start transition-colors",
                      active
                        ? "bg-primary/[0.08] text-foreground"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{name}</span>
                      <Badge variant={row.role === "admin" ? "default" : "secondary"}>
                        {row.role === "admin"
                          ? t("permissions.roleAdmin")
                          : t("permissions.roleEmployee")}
                      </Badge>
                    </span>
                    <span className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {row.user.email}
                    </span>
                    <span className="mt-1 text-[11px] text-muted-foreground">
                      {row.overrideCount > 0
                        ? t("permissions.overridesHint", {
                            count: row.overrideCount,
                          })
                        : t("permissions.roleDefaults")}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>

      <div className="surface-panel min-w-0 overflow-hidden">
        {!detail ? (
          <div className="px-4 py-16 text-center text-sm text-muted-foreground">
            {t("permissions.selectUser")}
          </div>
        ) : (
          <div className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-[0.95rem] font-semibold">
                  {detail.user.displayName?.trim() || detail.user.email}
                </h3>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  {t("permissions.enabledCount", {
                    enabled: draft.size,
                    total: ALL_PERMISSION_IDS.length,
                  })}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={detail.isProtected}
                  onClick={resetDefaults}
                >
                  <RotateCcw />
                  {t("permissions.resetDefaults")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={!dirty || saving || detail.isProtected}
                  onClick={() => void handleSave()}
                >
                  {saving ? <Loader2 className="animate-spin" /> : <Save />}
                  {t("common.save")}
                </Button>
              </div>
            </div>

            {detail.isProtected ? (
              <div className="rounded-lg border border-amber-300/70 bg-amber-50 px-3 py-2 text-[12px] text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
                <p className="font-medium">{t("permissions.protectedTitle")}</p>
                <p className="mt-0.5 opacity-90">
                  {t("permissions.protectedDesc")}
                </p>
              </div>
            ) : null}

            {!draft.has("dataAccess.viewOtherUsers") ? (
              <p className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-[12px] text-muted-foreground">
                {t("permissions.masterOffHint")}
              </p>
            ) : null}

            <UserPermissionsEditor
              effective={draft}
              defaults={defaults}
              locked={detail.isProtected}
              onChange={toggle}
            />
          </div>
        )}
      </div>
    </motion.section>
  );
}
