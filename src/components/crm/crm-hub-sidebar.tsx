"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
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

/** In-module rail for CRM hub views. */
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
        "surface-panel hub-mobile-nav overflow-hidden",
        className
      )}
    >
      <div className="hidden border-b border-border/60 px-4 py-3 lg:block">
        <p className="section-label text-primary/70">{t("crm.page.eyebrow")}</p>
        <p className="mt-1 text-sm font-semibold tracking-tight">
          {t("crm.sidebar.views")}
        </p>
      </div>

      <div className="relative lg:static">
        {/* Scroll affordance — soft edge fades on phones */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 start-0 z-[1] w-5 bg-gradient-to-r from-background to-transparent lg:hidden rtl:bg-gradient-to-l"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 end-0 z-[1] w-7 bg-gradient-to-l from-background to-transparent lg:hidden rtl:bg-gradient-to-r"
        />

        <ul
          role="tablist"
          aria-orientation="horizontal"
          className={cn(
            "scroll-x flex snap-x snap-mandatory gap-1.5 p-2 pe-5 ps-2",
            "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            "lg:grid lg:snap-none lg:gap-0.5 lg:overflow-visible lg:p-2"
          )}
        >
          {views.map((item) => {
            const Icon = item.icon;
            const isActive = tab === item.id;
            const showDelayBadge = item.id === "delay" && delayCount > 0;
            return (
              <li
                key={item.id}
                className="shrink-0 snap-center first:ms-0 last:me-1 lg:w-full"
              >
                <button
                  ref={isActive ? activeBtnRef : undefined}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => onTabChange(item.id)}
                  className={cn(
                    "relative touch-manipulation transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    // Mobile: compact vertical chip — more tabs visible, clearer taps
                    "flex min-h-[3.65rem] w-[4.35rem] flex-col items-center justify-center gap-1 rounded-2xl px-1.5 py-1.5 text-center sm:min-h-[3.85rem] sm:w-[4.75rem]",
                    // Desktop sidebar: horizontal row
                    "lg:min-h-10 lg:w-full lg:flex-row lg:items-center lg:justify-start lg:gap-2.5 lg:rounded-lg lg:px-2.5 lg:py-2 lg:text-start",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm lg:bg-primary/[0.08] lg:text-primary lg:shadow-none"
                      : "bg-muted/55 text-muted-foreground active:bg-muted lg:bg-transparent lg:hover:bg-muted lg:hover:text-foreground"
                  )}
                >
                  {isActive && !reduceMotion ? (
                    <motion.span
                      layoutId="crm-hub-nav"
                      className="absolute inset-y-1 start-0 hidden w-0.5 rounded-full bg-primary lg:block"
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 34,
                      }}
                    />
                  ) : isActive ? (
                    <span className="absolute inset-y-1 start-0 hidden w-0.5 rounded-full bg-primary lg:block" />
                  ) : null}

                  <span
                    className={cn(
                      "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border sm:h-8 sm:w-8 lg:h-7 lg:w-7 lg:rounded-md",
                      isActive
                        ? "border-white/25 bg-white/15 text-primary-foreground lg:border-primary/15 lg:bg-primary/10 lg:text-primary"
                        : "border-border/70 bg-card lg:bg-muted/40"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                    {showDelayBadge ? (
                      <span
                        className={cn(
                          "absolute -end-1.5 -top-1.5 inline-flex min-w-[1.1rem] items-center justify-center rounded-full px-1 py-px font-mono text-[9px] font-bold leading-none tabular-nums lg:hidden",
                          isActive
                            ? "bg-white text-primary"
                            : "bg-amber-500 text-white"
                        )}
                      >
                        {delayCount > 99 ? "99+" : delayCount}
                      </span>
                    ) : null}
                  </span>

                  <span
                    className={cn(
                      "w-full truncate text-[10.5px] font-semibold leading-tight tracking-tight sm:text-[11px]",
                      "lg:w-auto lg:max-w-none lg:flex-1 lg:text-start lg:text-[13px] lg:font-medium lg:leading-normal"
                    )}
                  >
                    {t(item.labelKey)}
                  </span>

                  {showDelayBadge ? (
                    <span
                      className={cn(
                        "ms-auto hidden min-w-5 items-center justify-center rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums lg:inline-flex",
                        isActive
                          ? "bg-amber-500/15 text-amber-800 dark:text-amber-200"
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
