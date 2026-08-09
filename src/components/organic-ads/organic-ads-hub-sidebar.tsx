"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  LayoutDashboard,
  ListChecks,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";

export type OrganicAdsHubTab =
  | "overview"
  | "advertisements"
  | "performance"
  | "validation";

interface OrganicAdsHubSidebarProps {
  tab: OrganicAdsHubTab;
  onTabChange: (tab: OrganicAdsHubTab) => void;
  canViewPerformance?: boolean;
  className?: string;
}

const VIEW_ITEMS: {
  id: OrganicAdsHubTab;
  icon: LucideIcon;
  labelKey:
    | "organicAds.nav.overview"
    | "organicAds.nav.advertisements"
    | "organicAds.nav.performance"
    | "organicAds.nav.validation";
  performanceOnly?: boolean;
}[] = [
  { id: "overview", icon: LayoutDashboard, labelKey: "organicAds.nav.overview" },
  {
    id: "advertisements",
    icon: ListChecks,
    labelKey: "organicAds.nav.advertisements",
  },
  {
    id: "performance",
    icon: Users,
    labelKey: "organicAds.nav.performance",
    performanceOnly: true,
  },
  {
    id: "validation",
    icon: ShieldCheck,
    labelKey: "organicAds.nav.validation",
  },
];

export function OrganicAdsHubSidebar({
  tab,
  onTabChange,
  canViewPerformance = false,
  className,
}: OrganicAdsHubSidebarProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

  const views = VIEW_ITEMS.filter((item) => {
    if (item.performanceOnly) return canViewPerformance;
    return true;
  });

  return (
    <nav
      aria-label={t("organicAds.sidebar.label")}
      className={cn("surface-panel overflow-hidden", className)}
    >
      <div className="hidden border-b border-border/60 px-4 py-3 lg:block">
        <p className="section-label text-primary/70">
          {t("organicAds.page.eyebrow")}
        </p>
        <p className="mt-1 text-sm font-semibold tracking-tight">
          {t("organicAds.sidebar.views")}
        </p>
      </div>

      <ul className="flex gap-1 overflow-x-auto p-2 [scrollbar-width:none] lg:grid lg:gap-0.5 lg:overflow-visible [&::-webkit-scrollbar]:hidden">
        {views.map((item) => {
          const Icon = item.icon;
          const isActive = tab === item.id;
          return (
            <li key={item.id} className="shrink-0 lg:w-full">
              <button
                type="button"
                onClick={() => onTabChange(item.id)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-start text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:rounded-lg lg:px-2.5 lg:py-2",
                  isActive
                    ? "bg-primary/[0.08] text-primary"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                {isActive && !reduceMotion ? (
                  <motion.span
                    layoutId="organic-ads-hub-nav"
                    className="absolute inset-y-1 start-0 hidden w-0.5 rounded-full bg-primary lg:block"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                ) : isActive ? (
                  <span className="absolute inset-y-1 start-0 hidden w-0.5 rounded-full bg-primary lg:block" />
                ) : null}
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg border lg:h-7 lg:w-7 lg:rounded-md",
                    isActive
                      ? "border-primary/15 bg-primary/10"
                      : "border-border/70 bg-muted/40"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                </span>
                <span className="whitespace-nowrap">{t(item.labelKey)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
