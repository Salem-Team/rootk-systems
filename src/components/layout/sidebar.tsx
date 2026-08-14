"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BrandMark } from "@/components/layout/brand-mark";
import { SidebarDailyPlan } from "@/components/layout/sidebar-daily-plan";
import { SidebarEmployeeTasks } from "@/components/layout/sidebar-employee-tasks";
import { APP_NAV, navForRole } from "@/constants/navigation";
import { hasAnyPermissionId } from "@/constants/permissions";
import { useUiStore } from "@/stores/ui-store";
import { useSessionStore } from "@/stores/session-store";
import { usePendingLeaveCount } from "@/hooks/use-pending-leave-count";
import { useOpenTaskCount } from "@/hooks/use-open-task-count";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { layoutSpring, sidebarItem, staggerContainer } from "@/lib/animations";

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUiStore();
  const role = useSessionStore((s) => s.role);
  const permissions = useSessionStore((s) => s.permissions);
  const pendingLeave = usePendingLeaveCount();
  const openTaskCount = useOpenTaskCount();
  const { t, isRtl } = useTranslation();
  const reduceMotion = useReducedMotion();
  const CollapseIcon = isRtl ? ChevronRight : ChevronLeft;
  const items = navForRole(role, APP_NAV, permissions);
  const showTasksAdminLabel = hasAnyPermissionId(
    ["tasks.viewAll", "tasks.assign", "tasks.editOthers"],
    permissions,
    role
  );
  const showLeaveReviewBadge = hasAnyPermissionId(
    ["leave.approve", "leave.reject", "leave.viewAll"],
    permissions,
    role
  );

  return (
    <aside
      className={cn(
        "fixed inset-y-0 start-0 z-40 hidden border-e border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none lg:flex lg:flex-col",
        "bg-[radial-gradient(ellipse_90%_55%_at_0%_0%,rgba(255,255,255,0.07),transparent_58%)]",
        sidebarCollapsed ? "w-[72px]" : "w-[252px]"
      )}
    >
      <div className="flex h-[3.4rem] items-center border-b border-white/[0.07] px-3.5">
        <BrandMark collapsed={sidebarCollapsed} />
      </div>

      <ScrollArea className="min-h-0 flex-1 px-2 py-3">
        <motion.nav
          key={role}
          variants={reduceMotion ? undefined : staggerContainer}
          initial={reduceMotion ? false : "hidden"}
          animate={reduceMotion ? undefined : "visible"}
          className="space-y-0.5"
          aria-label={t("common.mainNav")}
        >
          {items.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            const title =
              item.key === "tasks" && showTasksAdminLabel
                ? t("nav.tasksAdmin")
                : t(`nav.${item.key}`);
            const badgeCount =
              item.badge && item.key === "leave" && showLeaveReviewBadge
                ? pendingLeave
                : item.badge && item.key === "tasks"
                  ? openTaskCount
                  : 0;
            const showBadge = badgeCount > 0;
            const link = (
              <Link
                href={item.href}
                className={cn(
                  "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
                  active
                    ? "text-sidebar"
                    : "text-sidebar-foreground/60 hover:bg-white/[0.05] hover:text-white"
                )}
                aria-current={active ? "page" : undefined}
              >
                {active ? (
                  reduceMotion ? (
                    <span className="absolute inset-0 rounded-lg bg-white" />
                  ) : (
                    <motion.span
                      layoutId="sidebar-active"
                      className="absolute inset-0 rounded-lg bg-white"
                      transition={layoutSpring}
                    />
                  )
                ) : null}
                <span
                  className={cn(
                    "relative z-10 flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-sky-100/65 group-hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <AnimatePresence initial={false}>
                  {!sidebarCollapsed ? (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="relative z-10 flex flex-1 items-center justify-between"
                    >
                      {title}
                      {showBadge ? (
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold",
                            active
                              ? "bg-primary/10 text-primary"
                              : "bg-white/10 text-sky-100"
                          )}
                        >
                          {badgeCount}
                        </span>
                      ) : null}
                    </motion.span>
                  ) : null}
                </AnimatePresence>
              </Link>
            );

            return (
              <motion.div
                key={item.href}
                variants={reduceMotion ? undefined : sidebarItem}
              >                {sidebarCollapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>{link}</TooltipTrigger>
                    <TooltipContent side={isRtl ? "left" : "right"}>
                      {title}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  link
                )}
              </motion.div>
            );
          })}
        </motion.nav>

        {!sidebarCollapsed ? <SidebarDailyPlan /> : null}

        {role === "employee" && !sidebarCollapsed ? (
          <SidebarEmployeeTasks collapsed={false} />
        ) : null}
      </ScrollArea>

      <div className="border-t border-white/[0.06] p-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleSidebar}
          className="w-full rounded-lg text-sidebar-foreground/50 hover:bg-white/[0.06] hover:text-white"
          aria-label={
            sidebarCollapsed
              ? t("common.expandSidebar")
              : t("common.collapseSidebar")
          }
        >
          <CollapseIcon
            className={cn(
              "h-4 w-4 transition-transform duration-300",
              sidebarCollapsed && "rotate-180"
            )}
          />
        </Button>
      </div>
    </aside>
  );
}
