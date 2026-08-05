"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  CalendarPlus,
  Clock,
  FileBarChart,
  ListTodo,
  Plus,
  Settings,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";
import { snappySpring } from "@/lib/animations";
import { cn } from "@/lib/utils";
import type { TranslationPath } from "@/i18n";

const ACTIONS: {
  href: string;
  labelKey: TranslationPath;
  icon: typeof Clock;
  roles: Array<"admin" | "employee">;
}[] = [
  {
    href: "/tasks",
    labelKey: "ops.fabWork",
    icon: ListTodo,
    roles: ["admin", "employee"],
  },
  {
    href: "/attendance",
    labelKey: "ops.fabAttendance",
    icon: Clock,
    roles: ["admin", "employee"],
  },
  {
    href: "/leave",
    labelKey: "ops.fabLeave",
    icon: CalendarPlus,
    roles: ["admin", "employee"],
  },
  {
    href: "/employees",
    labelKey: "ops.fabPeople",
    icon: Users,
    roles: ["admin"],
  },
  {
    href: "/reports",
    labelKey: "ops.fabReports",
    icon: FileBarChart,
    roles: ["admin"],
  },
  {
    href: "/schedule",
    labelKey: "ops.fabSchedule",
    icon: Settings,
    roles: ["admin", "employee"],
  },
];

export function FloatingQuickActions({
  variant = "admin",
}: {
  variant?: "admin" | "employee";
}) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const actions = ACTIONS.filter((a) => a.roles.includes(variant));

  return (
    <div
      className={cn(
        "pointer-events-none fixed bottom-[5.75rem] end-3 z-30 flex-col items-end gap-2 pb-[env(safe-area-inset-bottom)] lg:bottom-8 lg:end-8",
        variant === "employee" ? "hidden lg:flex" : "flex"
      )}
    >
      <AnimatePresence>
        {open ? (
          <motion.ul
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 8 }}
            className="pointer-events-auto mb-1 flex w-52 flex-col gap-1.5 rounded-2xl border border-border/75 bg-card/95 p-2 shadow-[var(--shadow-float)] backdrop-blur-xl"
            role="menu"
            aria-label={t("ops.fabMenu")}
          >
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <li key={action.href}>
                  <Link
                    href={action.href}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <Icon className="h-4 w-4 text-primary" aria-hidden />
                    {t(action.labelKey)}
                  </Link>
                </li>
              );
            })}
            <li className="border-t border-border/60 px-3 py-1.5 text-[10px] text-muted-foreground">
              {t("ops.fabHint")}
            </li>
          </motion.ul>
        ) : null}
      </AnimatePresence>

      <motion.div
        whileHover={reduceMotion ? undefined : { scale: 1.04 }}
        whileTap={reduceMotion ? undefined : { scale: 0.96 }}
        transition={snappySpring}
        className="pointer-events-auto"
      >
        <Button
          type="button"
          size="icon"
          className={cn(
            "h-12 w-12 rounded-full shadow-lg",
            open && "bg-muted text-foreground hover:bg-muted"
          )}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={t("ops.fabToggle")}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? (
            <X className="h-5 w-5" aria-hidden />
          ) : (
            <Plus className="h-5 w-5" aria-hidden />
          )}
        </Button>
      </motion.div>
    </div>
  );
}
