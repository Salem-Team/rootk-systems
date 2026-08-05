"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  CalendarPlus,
  Clock,
  Command,
  FileBarChart,
  Settings,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp, snappySpring, staggerContainer } from "@/lib/animations";
import type { TranslationPath } from "@/i18n";

const ADMIN_ACTIONS: {
  href: string;
  titleKey: TranslationPath;
  descKey: TranslationPath;
  icon: typeof Clock;
}[] = [
  {
    href: "/attendance",
    titleKey: "dashboard.actionTeamAttendance",
    descKey: "dashboard.actionTeamAttendanceDesc",
    icon: Clock,
  },
  {
    href: "/leave",
    titleKey: "dashboard.actionReviewLeave",
    descKey: "dashboard.actionReviewLeaveDesc",
    icon: CalendarPlus,
  },
  {
    href: "/employees",
    titleKey: "dashboard.actionTeam",
    descKey: "dashboard.actionTeamDesc",
    icon: Users,
  },
  {
    href: "/reports",
    titleKey: "dashboard.actionReports",
    descKey: "dashboard.actionReportsDesc",
    icon: FileBarChart,
  },
  {
    href: "/schedule",
    titleKey: "dashboard.actionSchedule",
    descKey: "dashboard.actionScheduleDesc",
    icon: Settings,
  },
];

const EMPLOYEE_ACTIONS: typeof ADMIN_ACTIONS = [
  {
    href: "/attendance",
    titleKey: "dashboard.actionCheckIn",
    descKey: "dashboard.actionCheckInDesc",
    icon: Clock,
  },
  {
    href: "/leave",
    titleKey: "dashboard.actionLeave",
    descKey: "dashboard.actionLeaveDesc",
    icon: CalendarPlus,
  },
  {
    href: "/schedule",
    titleKey: "dashboard.actionMySchedule",
    descKey: "dashboard.actionMyScheduleDesc",
    icon: Settings,
  },
  {
    href: "/reports",
    titleKey: "dashboard.actionMyReports",
    descKey: "dashboard.actionMyReportsDesc",
    icon: FileBarChart,
  },
];

export function QuickActions({
  variant = "admin",
}: {
  variant?: "admin" | "employee";
}) {
  const { t, isRtl } = useTranslation();
  const reduceMotion = useReducedMotion();
  const Chevron = isRtl ? ChevronLeft : ChevronRight;
  const actions = variant === "admin" ? ADMIN_ACTIONS : EMPLOYEE_ACTIONS;

  return (
    <section
      className="surface-panel overflow-hidden"
      aria-labelledby="quick-actions-heading"
    >
      <div className="panel-header">
        <h3
          id="quick-actions-heading"
          className="text-[0.95rem] font-semibold tracking-tight"
        >
          {variant === "admin"
            ? t("dashboard.quickAdminActions")
            : t("dashboard.quickActions")}
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {t("dashboard.quickActionsDesc")}
        </p>
        <Badge variant="outline" className="mt-2 h-5 gap-1 text-[10px]">
          <Command className="h-3 w-3" aria-hidden />
          {t("ops.fabHint")}
        </Badge>
      </div>
      <motion.div
        variants={staggerContainer}
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
        className="grid gap-0 sm:grid-cols-2"
      >
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <motion.div
              key={action.href + action.titleKey}
              variants={fadeInUp}
              whileHover={
                reduceMotion ? undefined : { y: -1, transition: snappySpring }
              }
            >
              <Link
                href={action.href}
                className="group flex h-full items-center gap-3 border-b border-border/60 px-4 py-3.5 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 sm:border-e"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/[0.07] text-primary transition-colors group-hover:bg-primary/10">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold">
                    {t(action.titleKey)}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {t(action.descKey)}
                  </span>
                </span>
                <Chevron
                  className="h-3.5 w-3.5 text-muted-foreground/40 transition-colors group-hover:text-primary"
                  aria-hidden
                />
              </Link>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
