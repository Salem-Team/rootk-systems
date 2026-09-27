"use client";

import Link from "next/link";
import {
  CalendarPlus,
  Clock,
  FileBarChart,
  Users,
} from "lucide-react";
import { useSessionStore } from "@/stores/session-store";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import type { TranslationPath } from "@/i18n";

const QUICK_LINKS: {
  href: string;
  labelKey: TranslationPath;
  icon: typeof Clock;
}[] = [
  {
    href: "/attendance",
    labelKey: "dashboard.actionTeamAttendance",
    icon: Clock,
  },
  {
    href: "/leave",
    labelKey: "dashboard.actionReviewLeave",
    icon: CalendarPlus,
  },
  {
    href: "/employees",
    labelKey: "dashboard.actionTeam",
    icon: Users,
  },
  {
    href: "/reports",
    labelKey: "dashboard.actionReports",
    icon: FileBarChart,
  },
];

export function DashboardHero({
  present,
  totalEmployees,
}: {
  present: number;
  totalEmployees: number;
}) {
  const { t } = useTranslation();
  const firstName = useSessionStore((s) => s.user.firstName);

  return (
    <header className="min-w-0 max-w-full">
      <div className="flex min-w-0 flex-col gap-3.5 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="min-w-0 space-y-1.5">
          <h1 className="type-title break-words">
            {t("dashboard.welcomeTitle", { name: firstName || t("common.admin") })}
          </h1>
          <p className="type-subtitle max-w-xl">
            {t("dashboard.welcomeSubtitle", {
              present,
              total: totalEmployees,
            })}
          </p>
        </div>

        <nav
          aria-label={t("dashboard.quickActions")}
          className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end"
        >
          {QUICK_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex min-h-12 min-w-0 items-center gap-2.5 rounded-2xl border border-border/80 bg-card px-3 text-[13px] font-semibold leading-tight touch-manipulation",
                  "shadow-[0_1px_2px_rgba(11,20,36,0.04)] transition-colors",
                  "sm:inline-flex sm:h-9 sm:min-h-0 sm:w-auto sm:gap-2 sm:rounded-lg sm:px-3 sm:font-medium",
                  "hover:border-primary/30 hover:bg-primary/[0.04] hover:text-primary",
                  "active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                )}
              >
                <span className="icon-well h-8 w-8 shrink-0 sm:h-auto sm:w-auto sm:border-0 sm:bg-transparent sm:shadow-none">
                  <Icon className="h-3.5 w-3.5 opacity-80" aria-hidden />
                </span>
                <span className="min-w-0 line-clamp-2 leading-snug sm:truncate">
                  {t(link.labelKey)}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
