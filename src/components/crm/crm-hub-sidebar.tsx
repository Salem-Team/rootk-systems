"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import {
  Activity,
  Building2,
  Columns3,
  FileBarChart2,
  Gauge,
  LayoutDashboard,
  ListChecks,
  MessageSquareText,
  TimerReset,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";

export type CrmHubTab =
  | "dashboard"
  | "leads"
  | "delay"
  | "pipeline"
  | "activities"
  | "feedback"
  | "performance"
  | "stages"
  | "businessTypes"
  | "reports";

interface CrmHubSidebarProps {
  tab: CrmHubTab;
  onTabChange: (tab: CrmHubTab) => void;
  canViewPerformance?: boolean;
  canManageStages?: boolean;
  canManageBusinessTypes?: boolean;
  canViewReports?: boolean;
  delayCount?: number;
  className?: string;
}

const VIEW_ITEMS: {
  id: CrmHubTab;
  icon: LucideIcon;
  labelKey:
    | "crm.nav.dashboard"
    | "crm.nav.leads"
    | "crm.nav.delay"
    | "crm.nav.pipeline"
    | "crm.nav.activities"
    | "crm.nav.feedback"
    | "crm.nav.performance"
    | "crm.nav.stages"
    | "crm.nav.businessTypes"
    | "crm.nav.reports";
  performanceOnly?: boolean;
  adminStages?: boolean;
  adminBusinessTypes?: boolean;
  reportsOnly?: boolean;
}[] = [
  { id: "dashboard", icon: LayoutDashboard, labelKey: "crm.nav.dashboard" },
  { id: "leads", icon: ListChecks, labelKey: "crm.nav.leads" },
  { id: "delay", icon: TimerReset, labelKey: "crm.nav.delay" },
  { id: "pipeline", icon: Columns3, labelKey: "crm.nav.pipeline" },
  { id: "activities", icon: Activity, labelKey: "crm.nav.activities" },
  { id: "feedback", icon: MessageSquareText, labelKey: "crm.nav.feedback" },
  {
    id: "performance",
    icon: Gauge,
    labelKey: "crm.nav.performance",
    performanceOnly: true,
  },
  {
    id: "stages",
    icon: Workflow,
    labelKey: "crm.nav.stages",
    adminStages: true,
  },
  {
    id: "businessTypes",
    icon: Building2,
    labelKey: "crm.nav.businessTypes",
    adminBusinessTypes: true,
  },
  {
    id: "reports",
    icon: FileBarChart2,
    labelKey: "crm.nav.reports",
    reportsOnly: true,
  },
];

/** Horizontal top rail for CRM hub views — keeps the main panel full-width. */
export function CrmHubSidebar({
  tab,
  onTabChange,
  canViewPerformance = false,
  canManageStages = false,
  canManageBusinessTypes = false,
  canViewReports = false,
  delayCount = 0,
  className,
}: CrmHubSidebarProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const activeBtnRef = useRef<HTMLButtonElement | null>(null);

  const views = VIEW_ITEMS.filter((item) => {
    if (item.performanceOnly) return canViewPerformance;
    if (item.adminStages) return canManageStages;
    if (item.adminBusinessTypes) return canManageBusinessTypes;
    if (item.reportsOnly) return canViewReports;
    return true;
  });

  useEffect(() => {
    const el = activeBtnRef.current;
    if (!el || typeof el.scrollIntoView !== "function") return;
    try {
      el.scrollIntoView({
        inline: "center",
        block: "nearest",
        behavior: reduceMotion ? "auto" : "smooth",
      });
    } catch {
      /* ignore — some WebViews reject scrollIntoView options */
    }
  }, [tab, reduceMotion, views.length]);

  return (
    <nav
      aria-label={t("crm.sidebar.label")}
      className={cn(
        "surface-panel hub-top-nav overflow-hidden",
        className
      )}
    >
      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 start-0 z-[1] w-5 bg-gradient-to-r from-background to-transparent sm:from-card rtl:bg-gradient-to-l"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 end-0 z-[1] w-7 bg-gradient-to-l from-background to-transparent sm:from-card rtl:bg-gradient-to-r"
        />

        <ul
          role="tablist"
          aria-orientation="horizontal"
          className={cn(
            "scroll-x flex snap-x snap-mandatory gap-1 p-1.5 pe-5 ps-2",
            "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            "sm:gap-1.5 sm:p-2 sm:pe-4"
          )}
        >
          {views.map((item) => {
            const Icon = item.icon;
            const isActive = tab === item.id;
            const showDelayBadge = item.id === "delay" && delayCount > 0;
            return (
              <li key={item.id} className="shrink-0 snap-center">
                <button
                  ref={isActive ? activeBtnRef : undefined}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => onTabChange(item.id)}
                  className={cn(
                    "relative flex touch-manipulation items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    "min-h-11 min-w-[3.25rem] sm:min-h-10 sm:min-w-0 sm:rounded-lg sm:px-3",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted"
                  )}
                >
                  <span className="relative flex shrink-0 items-center justify-center">
                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
                    {showDelayBadge ? (
                      <span
                        className={cn(
                          "absolute -end-2 -top-2 inline-flex min-w-[1.05rem] items-center justify-center rounded-full px-1 py-px font-mono text-[9px] font-bold leading-none tabular-nums sm:hidden",
                          isActive
                            ? "bg-white text-primary"
                            : "bg-amber-500 text-white"
                        )}
                      >
                        {delayCount > 99 ? "99+" : delayCount}
                      </span>
                    ) : null}
                  </span>

                  <span className="hidden max-w-[9rem] truncate text-[12px] font-semibold tracking-tight sm:inline lg:text-[13px]">
                    {t(item.labelKey)}
                  </span>

                  {showDelayBadge ? (
                    <span
                      className={cn(
                        "ms-0.5 hidden min-w-5 items-center justify-center rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums sm:inline-flex",
                        isActive
                          ? "bg-white/20 text-primary-foreground"
                          : "bg-amber-500/15 text-amber-800 dark:text-amber-200"
                      )}
                    >
                      {delayCount > 99 ? "99+" : delayCount}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
