"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  RotateCcw,
  Save,
  Search,
  Shield,
  ShieldCheck,
} from "lucide-react";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPermissionsEditor } from "@/components/admin/user-permissions-editor";
import type {
  UserPermissionDetail,
  UserPermissionSummary,
} from "@/types/permissions";
import type { AppUser } from "@/types";

function displayName(user: AppUser) {
  return user.displayName?.trim() || user.email;
}

export function UserPermissionsPanel() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<UserPermissionSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<UserPermissionDetail | null>(null);
  const [draft, setDraft] = useState<Set<PermissionId>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const res = await listPermissionUsers();
    if (res.success) {
      setUsers(res.data);
      setSelectedId((current) => current ?? res.data[0]?.user.id ?? null);
    } else {
      setUsers([]);
      setSelectedId(null);
      toast.error(res.message || t("permissions.loadUsersFailed"));
    }
    setLoading(false);
  }, [t]);

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
      const name = displayName(row.user).toLowerCase();
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

  function openUser(id: string) {
    setSelectedId(id);
    setMobileDetailOpen(true);
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function closeMobileDetail() {
    setMobileDetailOpen(false);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
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

  function grantAdminAll() {
    if (!detail || detail.isProtected) return;
    setDraft(new Set(ALL_PERMISSION_IDS));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const actions = detail ? (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="min-h-11 flex-1 sm:min-h-8 sm:flex-none"
        disabled={detail.isProtected}
        title={t("permissions.grantAdminAllHint")}
        onClick={grantAdminAll}
      >
        <ShieldCheck />
        <span className="truncate">{t("permissions.grantAdminAll")}</span>
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="min-h-11 flex-1 sm:min-h-8 sm:flex-none"
        disabled={detail.isProtected}
        onClick={resetDefaults}
      >
        <RotateCcw />
        <span className="truncate">{t("permissions.resetDefaults")}</span>
      </Button>
      <Button
        type="button"
        size="sm"
        className="min-h-11 flex-1 sm:min-h-8 sm:flex-none"
        disabled={!dirty || saving || detail.isProtected}
        onClick={() => void handleSave()}
      >
        {saving ? <Loader2 className="animate-spin" /> : <Save />}
        {t("common.save")}
      </Button>
    </>
  ) : null;

  return (
    <motion.section
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      className="grid gap-4 lg:grid-cols-[minmax(16.5rem,19rem)_minmax(0,1fr)]"
    >
      <div
        className={cn(
          "surface-panel overflow-hidden",
          mobileDetailOpen && "hidden lg:block"
        )}
      >
        <div className="border-b border-border/60 px-3 py-3 sm:px-4">
          <h3 className="flex items-center gap-2 text-[0.95rem] font-semibold">
            <Shield className="h-4 w-4 text-primary" aria-hidden />
            {t("permissions.title")}
          </h3>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
            {t("permissions.usersHint")}
          </p>
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground sm:start-2.5 sm:h-3.5 sm:w-3.5" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("permissions.searchUsers")}
              className="h-11 ps-10 text-base sm:h-9 sm:ps-8 sm:text-sm"
            />
          </div>
        </div>
        <ul className="max-h-none space-y-0.5 p-2 lg:max-h-[70vh] lg:overflow-y-auto">
          {filteredUsers.length === 0 ? (
            <li className="px-3 py-10 text-center text-sm text-muted-foreground">
              {users.length === 0
                ? t("permissions.noUsersLoaded")
                : t("permissions.noUsers")}
            </li>
          ) : (
            filteredUsers.map((row) => {
              const active = row.user.id === selectedId;
              const name = displayName(row.user);
              return (
                <li key={row.user.id}>
                  <button
                    type="button"
                    onClick={() => openUser(row.user.id)}
                    aria-current={active ? "true" : undefined}
                    aria-label={t("permissions.openUser", { name })}
                    className={cn(
                      "flex min-h-[3.75rem] w-full touch-manipulation items-center gap-3 rounded-xl px-2.5 py-2.5 text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active
                        ? "bg-primary/[0.08] text-foreground"
                        : "hover:bg-muted/50 active:bg-muted/70"
                    )}
                  >
                    <Avatar className="h-10 w-10 border border-border/60">
                      <AvatarFallback className="text-[11px]">
                        {row.user.initials || name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold">
                          {name}
                        </span>
                        <Badge
                          variant={row.role === "admin" ? "default" : "secondary"}
                          className="shrink-0"
                        >
                          {row.role === "admin"
                            ? t("permissions.roleAdmin")
                            : t("permissions.roleEmployee")}
                        </Badge>
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                        {row.user.email}
                      </span>
                      <span className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        {row.isProtected ? (
                          <Badge variant="warning" className="px-1.5 py-0 text-[10px]">
                            {t("permissions.protectedShort")}
                          </Badge>
                        ) : row.overrideCount > 0 ? (
                          t("permissions.overridesHint", {
                            count: row.overrideCount,
                          })
                        ) : (
                          t("permissions.roleDefaults")
                        )}
                      </span>
                    </span>
                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-muted-foreground lg:hidden rtl:rotate-180"
                      aria-hidden
                    />
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>

      <div
        className={cn(
          "surface-panel min-w-0 overflow-hidden",
          !mobileDetailOpen && "hidden lg:block"
        )}
      >
        {!detail ? (
          <div className="px-4 py-16 text-center text-sm text-muted-foreground">
            {t("permissions.selectUser")}
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="border-b border-border/60 px-3 py-3 sm:px-5 sm:py-4">
              <div className="flex items-start gap-2.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="mt-0.5 h-11 w-11 shrink-0 lg:hidden"
                  onClick={closeMobileDetail}
                  aria-label={t("permissions.backToUsers")}
                >
                  <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
                </Button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-3">
                    <Avatar className="mt-0.5 hidden h-11 w-11 border border-border/60 sm:flex">
                      <AvatarFallback className="text-xs">
                        {detail.user.initials ||
                          displayName(detail.user).slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-[1.02rem] font-semibold leading-snug sm:text-[0.95rem]">
                        {displayName(detail.user)}
                      </h3>
                      <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                        {detail.user.email}
                      </p>
                      <p className="mt-1 text-[12px] text-muted-foreground">
                        {t("permissions.enabledCount", {
                          enabled: draft.size,
                          total: ALL_PERMISSION_IDS.length,
                        })}
                        {dirty ? (
                          <span className="ms-2 font-medium text-amber-700 dark:text-amber-300">
                            · {t("permissions.unsaved")}
                          </span>
                        ) : null}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="hidden flex-wrap justify-end gap-2 lg:flex">
                  {actions}
                </div>
              </div>
            </div>

            <div className="space-y-4 p-3 pb-14 sm:p-5 lg:pb-5">
              {detail.isProtected ? (
                <div className="rounded-xl border border-amber-300/70 bg-amber-50 px-3 py-2.5 text-[12px] leading-relaxed text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100 sm:rounded-lg">
                  <p className="font-medium">{t("permissions.protectedTitle")}</p>
                  <p className="mt-0.5 opacity-90">
                    {t("permissions.protectedDesc")}
                  </p>
                </div>
              ) : null}

              {!detail.isProtected ? (
                <div className="rounded-xl border border-border/70 bg-muted/30 px-3 py-3 sm:rounded-lg sm:px-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("permissions.quickActions")}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="min-h-10"
                      onClick={grantAdminAll}
                    >
                      <ShieldCheck />
                      {t("permissions.grantAdminAll")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="min-h-10"
                      onClick={resetDefaults}
                    >
                      <RotateCcw />
                      {t("permissions.resetDefaults")}
                    </Button>
                  </div>
                  <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
                    {t("permissions.grantAdminAllHint")}
                  </p>
                </div>
              ) : null}

              {!draft.has("dataAccess.viewOtherUsers") ? (
                <p className="rounded-xl border border-border/70 bg-muted/40 px-3 py-2.5 text-[12px] leading-relaxed text-muted-foreground sm:rounded-lg">
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
          </div>
        )}
      </div>

      {mobileDetailOpen && detail ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-[5.5rem] z-30 px-3 pb-[env(safe-area-inset-bottom)] lg:hidden">
          <div className="pointer-events-auto flex gap-2 rounded-2xl border border-border/70 bg-card/95 p-2 shadow-[var(--shadow-float)] backdrop-blur-xl">
            {actions}
          </div>
        </div>
      ) : null}
    </motion.section>
  );
}
