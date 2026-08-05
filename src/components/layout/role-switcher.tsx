"use client";

import { usePathname, useRouter } from "next/navigation";
import { Shield, UserRound } from "lucide-react";
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
import { canAccessRoute } from "@/constants/navigation";
import { isApiMode } from "@/lib/env";
import { signInWithRole } from "@/services/auth.service";
import { useSessionStore } from "@/stores/session-store";
import { useAttendanceStore } from "@/stores/attendance-store";
import { useTranslation } from "@/hooks/use-translation";
import type { UserRole } from "@/types";
import { cn } from "@/lib/utils";

export function RoleSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const role = useSessionStore((s) => s.role);
  const setRole = useSessionStore((s) => s.setRole);
  const resetAttendance = useAttendanceStore((s) => s.reset);
  const fetchTodayRecord = useAttendanceStore((s) => s.fetchTodayRecord);

  async function handleSwitch(next: UserRole) {
    if (next === role) return;
    resetAttendance();
    if (isApiMode()) {
      const res = await signInWithRole(next);
      if (!res.success) {
        toast.error(res.message ?? t("common.error"));
        return;
      }
    } else {
      setRole(next);
    }
    await fetchTodayRecord();
    toast.success(
      t("roles.viewingAs", {
        role: next === "admin" ? t("roles.admin") : t("roles.employee"),
      })
    );
    if (!canAccessRoute(next, pathname)) {
      router.replace("/dashboard");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2 rounded-xl border-border/70 bg-card/60"
          aria-label={t("roles.switchLabel")}
        >
          {role === "admin" ? (
            <Shield className="h-3.5 w-3.5" />
          ) : (
            <UserRound className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">
            {role === "admin" ? t("roles.admin") : t("roles.employee")}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>{t("roles.switchLabel")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => void handleSwitch("admin")}
          className={cn(
            "flex-col items-start gap-0.5",
            role === "admin" && "bg-accent"
          )}
        >
          <span className="flex items-center gap-2 font-medium">
            <Shield className="h-4 w-4" />
            {t("roles.admin")}
          </span>
          <span className="text-xs text-muted-foreground">
            {t("roles.adminDesc")}
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => void handleSwitch("employee")}
          className={cn(
            "flex-col items-start gap-0.5",
            role === "employee" && "bg-accent"
          )}
        >
          <span className="flex items-center gap-2 font-medium">
            <UserRound className="h-4 w-4" />
            {t("roles.employee")}
          </span>
          <span className="text-xs text-muted-foreground">
            {t("roles.employeeDesc")}
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
