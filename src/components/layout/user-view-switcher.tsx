"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Loader2, Search, UserRoundSearch } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  hasPermissionId,
} from "@/constants/permissions";
import { useTranslation } from "@/hooks/use-translation";
import { useAttendanceStore } from "@/stores/attendance-store";
import { startUserView } from "@/services/auth.service";
import { getUsers } from "@/services/user.service";
import { useSessionStore } from "@/stores/session-store";
import type { AppUser } from "@/types";

function userLabel(user: AppUser) {
  return user.displayName?.trim() || user.email;
}

/** Admin navbar control: pick a user and enter their account. */
export function UserViewSwitcher() {
  const router = useRouter();
  const { t, isRtl } = useTranslation();
  const permissions = useSessionStore((s) => s.permissions);
  const role = useSessionStore((s) => s.role);
  const currentUserId = useSessionStore((s) => s.user.id);
  const impersonation = useSessionStore((s) => s.impersonation);

  const canView = hasPermissionId(
    "settings.impersonateUsers",
    permissions,
    role
  );

  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const res = await getUsers();
    if (res.success) setUsers(res.data.filter((u) => u.isActive && !u.deletedAt));
    else toast.error(res.message || t("userView.loadFailed"));
    setLoading(false);
  }, [t]);

  useEffect(() => {
    if (open && canView && !impersonation) void loadUsers();
  }, [open, canView, impersonation, loadUsers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = users.filter((u) => u.id !== currentUserId);
    if (!q) return list;
    return list.filter((u) => {
      const name = userLabel(u).toLowerCase();
      return (
        name.includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
      );
    });
  }, [currentUserId, query, users]);

  if (!canView || impersonation) return null;

  async function enterAs(user: AppUser) {
    setBusyId(user.id);
    const res = await startUserView(user.id);
    setBusyId(null);
    if (!res.success) {
      toast.error(res.message || t("userView.enterFailed"));
      return;
    }
    useAttendanceStore.getState().reset();
    setOpen(false);
    toast.success(
      t("userView.entered", { name: userLabel(user) })
    );
    router.replace("/dashboard");
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 border-border/70 bg-card/80 px-2.5 text-[12px] font-semibold shadow-none"
          aria-label={t("userView.trigger")}
        >
          <UserRoundSearch className="h-3.5 w-3.5 text-primary" aria-hidden />
          <span className="hidden sm:inline">{t("userView.triggerShort")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={isRtl ? "start" : "end"}
        className="w-[min(100vw-1.5rem,22rem)] p-0"
      >
        <div className="border-b border-border/60 px-3 py-2.5">
          <DropdownMenuLabel className="p-0 text-[13px] font-semibold">
            {t("userView.title")}
          </DropdownMenuLabel>
          <p className="mt-1 text-[11px] font-normal leading-snug text-muted-foreground">
            {t("userView.desc")}
          </p>
          <div className="relative mt-2.5">
            <Search
              className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("userView.search")}
              className="h-8 ps-8 text-[12px]"
              autoFocus
            />
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto overscroll-contain p-1">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs">{t("common.loading")}</span>
            </div>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-muted-foreground">
              {t("userView.empty")}
            </p>
          ) : (
            filtered.map((user) => {
              const name = userLabel(user);
              const busy = busyId === user.id;
              return (
                <DropdownMenuItem
                  key={user.id}
                  disabled={Boolean(busyId)}
                  className="cursor-pointer gap-2.5 rounded-lg px-2 py-2"
                  onSelect={(e) => {
                    e.preventDefault();
                    void enterAs(user);
                  }}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[10px] font-semibold text-primary">
                    {user.initials || name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium">
                      {name}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {user.email}
                    </span>
                  </span>
                  <Badge variant="secondary" className="shrink-0">
                    {user.role === "admin"
                      ? t("roles.admin")
                      : t("roles.employee")}
                  </Badge>
                  {busy ? (
                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                  ) : (
                    <Eye className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                </DropdownMenuItem>
              );
            })
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />
        <p className="px-3 py-2 text-[10px] leading-snug text-muted-foreground">
          {t("userView.hint")}
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
