"use client";

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
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";

export type CrmHubTab =
  | "dashboard"
  | "leads"
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
  className?: string;
}

const VIEW_ITEMS: {
  id: CrmHubTab;
  icon: LucideIcon;
  labelKey:
    | "crm.nav.dashboard"
    | "crm.nav.leads"
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
  className,
}: CrmHubSidebarProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

  const views = VIEW_ITEMS.filter((item) => {
    if (item.performanceOnly) return canViewPerformance;
    if (item.adminStages) return canManageStages;
    if (item.adminBusinessTypes) return canManageBusinessTypes;
    if (item.reportsOnly) return canViewReports;
    return true;
  });

  return (
    <nav
      aria-label={t("crm.sidebar.label")}
      className={cn("surface-panel overflow-hidden", className)}
    >
      <div className="hidden border-b border-border/60 px-4 py-3 lg:block">
        <p className="section-label text-primary/70">{t("crm.page.eyebrow")}</p>
        <p className="mt-1 text-sm font-semibold tracking-tight">
          {t("crm.sidebar.views")}
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
