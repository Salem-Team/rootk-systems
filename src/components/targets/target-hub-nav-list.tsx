import { motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  Clock3,
  Gauge,
  LayoutDashboard,
  ListChecks,
  Tags,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import type { TargetHubTab } from "./target-hub-sidebar";

const VIEW_ITEMS: {
  id: TargetHubTab;
  icon: LucideIcon;
  labelKey:
    | "targets.nav.dashboard"
    | "targets.nav.targets"
    | "targets.nav.performance"
    | "targets.nav.catalog"
    | "targets.nav.warnings"
    | "targets.nav.delayed";
  adminOnly?: boolean;
  reportsOnly?: boolean;
}[] = [
  { id: "dashboard", icon: LayoutDashboard, labelKey: "targets.nav.dashboard" },
  { id: "targets", icon: ListChecks, labelKey: "targets.nav.targets" },
  {
    id: "performance",
    icon: Gauge,
    labelKey: "targets.nav.performance",
    reportsOnly: true,
  },
  {
    id: "catalog",
    icon: Tags,
    labelKey: "targets.nav.catalog",
    adminOnly: true,
  },
  { id: "warnings", icon: AlertTriangle, labelKey: "targets.nav.warnings" },
  { id: "delayed", icon: Clock3, labelKey: "targets.nav.delayed" },
];

export function TargetHubNavList({
  tab,
  onTabChange,
  canManageCatalog,
  canViewReports,
}: {
  tab: TargetHubTab;
  onTabChange: (tab: TargetHubTab) => void;
  canManageCatalog: boolean;
  canViewReports: boolean;
}) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

  const views = VIEW_ITEMS.filter((item) => {
    if (item.reportsOnly) return canViewReports;
    if (item.adminOnly) return canManageCatalog;
    return true;
  });

  return (
    <ul className="scroll-x flex snap-x snap-mandatory gap-1.5 p-2 [scrollbar-width:none] lg:grid lg:snap-none lg:gap-0.5 lg:overflow-visible [&::-webkit-scrollbar]:hidden">
      {views.map((item) => {
        const Icon = item.icon;
        const isActive = tab === item.id;
        return (
          <li key={item.id} className="shrink-0 snap-start lg:w-full">
            <button
              type="button"
              onClick={() => onTabChange(item.id)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex min-h-11 w-full touch-manipulation items-center gap-2 rounded-xl px-3 py-2.5 text-start text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:gap-2.5 lg:rounded-lg lg:px-2.5 lg:py-2 lg:font-medium",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm lg:bg-primary/[0.08] lg:text-primary lg:shadow-none"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground lg:bg-transparent"
              )}
            >
              {isActive && !reduceMotion ? (
                <motion.span
                  layoutId="targets-hub-nav"
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
                    ? "border-white/20 bg-white/15 text-primary-foreground lg:border-primary/15 lg:bg-primary/10 lg:text-primary"
                    : "border-border/70 bg-card lg:bg-muted/40"
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
  );
}
