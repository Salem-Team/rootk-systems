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
          className="scroll-x -mx-3 flex max-w-full snap-x snap-mandatory gap-2 px-3 pb-0.5 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden"
        >
          {QUICK_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "inline-flex h-11 shrink-0 snap-start items-center gap-2 rounded-xl border border-border/80 bg-card px-3.5 text-[13px] font-medium touch-manipulation",
                  "shadow-[0_1px_2px_rgba(11,20,36,0.03)] transition-colors sm:h-9 sm:rounded-lg sm:px-3",
                  "hover:border-primary/30 hover:bg-primary/[0.04] hover:text-primary",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                )}
              >
                <Icon className="h-3.5 w-3.5 opacity-70" aria-hidden />
                {t(link.labelKey)}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
