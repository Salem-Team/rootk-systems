"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSessionStore } from "@/stores/session-store";
import { useAttendanceStore } from "@/stores/attendance-store";
import { useTranslation } from "@/hooks/use-translation";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { isApiMode } from "@/lib/env";
import { signInWithRole } from "@/services/auth.service";
import { easeOutExpo } from "@/lib/animations";
import type { UserRole } from "@/types";

export function RoleBanner() {
  const router = useRouter();
  const { t } = useTranslation();
  const role = useSessionStore((s) => s.role);
  const user = useSessionStore((s) => s.user);
  const setRole = useSessionStore((s) => s.setRole);
  const resetAttendance = useAttendanceStore((s) => s.reset);
  const fetchTodayRecord = useAttendanceStore((s) => s.fetchTodayRecord);
  const reduceMotion = useReducedMotion();

  async function switchRole() {
    const next: UserRole = role === "admin" ? "employee" : "admin";
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
    router.push("/dashboard");
  }

  const banner = (
    <div className="hidden border-b border-border/55 bg-gradient-to-b from-muted/50 to-muted/25 lg:block">
      <div className="content-frame flex flex-wrap items-center justify-between gap-2 px-4 py-1.5 md:px-6 lg:px-8">
        <p className="min-w-0 truncate text-[12px] text-muted-foreground">
          <span className="font-medium text-foreground/90">
            {t("roles.viewingAs", {
              role: role === "admin" ? t("roles.admin") : t("roles.employee"),
            })}
          </span>
          <span className="mx-1.5 text-border">·</span>
          {t(user.nameKey)}
          <span className="mx-1.5 hidden text-border sm:inline">·</span>
          <span className="hidden font-mono text-[11px] sm:inline">
            {user.employeeId}
          </span>
        </p>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 rounded-md px-2 text-xs text-primary hover:bg-primary/8 hover:text-primary"
          onClick={() => void switchRole()}
        >
          <ArrowLeftRight className="h-3 w-3" />
          {role === "admin" ? t("roles.employee") : t("roles.admin")}
        </Button>
      </div>
    </div>
  );

  if (reduceMotion) {
    return <div key={role}>{banner}</div>;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={role}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.28, ease: easeOutExpo }}
      >
        {banner}
      </motion.div>
    </AnimatePresence>
  );
}
