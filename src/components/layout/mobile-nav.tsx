"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { BrandMark } from "@/components/layout/brand-mark";
import { SidebarDailyPlan } from "@/components/layout/sidebar-daily-plan";
import { APP_NAV, MOBILE_NAV, navForRole } from "@/constants/navigation";
import { hasAnyPermissionId } from "@/constants/permissions";
import { useUiStore } from "@/stores/ui-store";
import { useSessionStore } from "@/stores/session-store";
import { useOpenClientRequestCount } from "@/hooks/use-open-client-request-count";
import { usePendingLeaveCount } from "@/hooks/use-pending-leave-count";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { layoutSpring, softSpring } from "@/lib/animations";

export function MobileBottomNav() {
  const pathname = usePathname();
  const role = useSessionStore((s) => s.role);
  const permissions = useSessionStore((s) => s.permissions);
  const setMobileMenuOpen = useUiStore((s) => s.setMobileMenuOpen);
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const user = useSessionStore((s) => s.user);
  const openClientRequests = useOpenClientRequestCount();
  const items = navForRole(role, MOBILE_NAV, permissions, user);
  const showTasksAdminLabel = hasAnyPermissionId(
    ["tasks.viewAll", "tasks.assign", "tasks.editOthers"],
    permissions,
    role
  );

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 max-w-full pb-[max(0.55rem,env(safe-area-inset-bottom))] pt-2 lg:hidden",
        items.length >= 6 ? "px-1" : "px-2 sm:px-3"
      )}
      aria-label={t("common.mobileNav")}
    >
      <ul
        className={cn(
          "mx-auto grid w-full max-w-lg rounded-2xl border border-border/65 bg-card/92 shadow-[var(--shadow-float)] backdrop-blur-2xl supports-[backdrop-filter]:bg-card/80",
          items.length >= 6 ? "gap-0 p-1" : "gap-0.5 p-1.5",
          items.length <= 4
            ? "grid-cols-4"
            : items.length === 5
              ? "grid-cols-5"
              : "grid-cols-6"
        )}
      >
        {items.map((item) => {
          const isMore = item.key === "more";
          const active = isMore
            ? false
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = isMore ? Menu : item.icon;

          const label =
            item.key === "tasks" && showTasksAdminLabel
              ? t("nav.tasksAdminShort")
              : item.key === "tasks"
                ? t("nav.tasksShort")
                : item.key === "crm"
                  ? t("nav.crmShort")
                  : item.key === "clientRequests"
                    ? t("nav.clientRequestsShort")
                    : isMore
                      ? t("nav.more")
                      : t(`nav.${item.key}`);
          const labelClass = cn(
            "relative z-10 block w-full text-center font-semibold leading-none tracking-tight whitespace-nowrap",
            items.length >= 6
              ? "text-[9px]"
              : "text-[10px] sm:text-[11px]"
          );

          if (isMore) {
            return (
              <li key={item.key} className="min-w-0">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  className="relative flex min-h-[3.35rem] w-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-0 py-1 text-muted-foreground transition-colors touch-manipulation hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                  aria-label={t("common.openMenu")}
                >
                  <span className="flex h-7 w-7 items-center justify-center">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className={labelClass}>{label}</span>
                </button>
              </li>
            );
          }

          return (
            <li key={item.href} className="min-w-0">
              <Link
                href={item.href}
                title={label}
                className={cn(
                  "relative flex min-h-[3.35rem] w-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-0 py-1 font-semibold transition-colors touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-current={active ? "page" : undefined}
              >
                {active ? (
                  reduceMotion ? (
                    <span className="absolute inset-x-0.5 top-0.5 h-7 rounded-xl bg-primary/12" />
                  ) : (
                    <motion.span
                      layoutId="mobile-nav-active"
                      className="absolute inset-x-0.5 top-0.5 h-7 rounded-xl bg-primary/12"
                      transition={layoutSpring}
                    />
                  )
                ) : null}
                <motion.span
                  className="relative z-10 flex h-7 w-7 items-center justify-center"
                  animate={
                    reduceMotion
                      ? undefined
                      : active
                        ? { scale: 1.06, y: -1 }
                        : { scale: 1, y: 0 }
                  }
                  transition={layoutSpring}
                >
                  <Icon className="h-4 w-4" />
                  {item.key === "clientRequests" && openClientRequests > 0 ? (
                    <span className="absolute -end-1 -top-1 min-w-4 rounded-full bg-primary px-1 text-center font-mono text-[9px] font-semibold leading-4 text-primary-foreground">
                      {openClientRequests > 99 ? "99+" : openClientRequests}
                    </span>
                  ) : null}
                </motion.span>
                <span className={labelClass}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function MobileDrawer() {
  const pathname = usePathname();
  const mobileMenuOpen = useUiStore((s) => s.mobileMenuOpen);
  const setMobileMenuOpen = useUiStore((s) => s.setMobileMenuOpen);
  const role = useSessionStore((s) => s.role);
  const permissions = useSessionStore((s) => s.permissions);
  const pendingLeave = usePendingLeaveCount();
  const openClientRequests = useOpenClientRequestCount();
  const { t, isRtl } = useTranslation();
  const reduceMotion = useReducedMotion();
  const user = useSessionStore((s) => s.user);
  const items = navForRole(role, APP_NAV, permissions, user);
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

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prevOverflow = document.body.style.overflow;
    const prevPadding = document.body.style.paddingRight;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPadding;
    };
  }, [mobileMenuOpen]);

  return (
    <AnimatePresence>
      {mobileMenuOpen ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : undefined}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setMobileMenuOpen(false);
            }}
            role="button"
            tabIndex={0}
            aria-label={t("common.closeMenu")}
          />
          <motion.aside
            initial={
              reduceMotion ? false : { x: isRtl ? "100%" : "-100%" }
            }
            animate={{ x: 0 }}
            exit={
              reduceMotion
                ? { opacity: 0 }
                : { x: isRtl ? "100%" : "-100%" }
            }
            transition={
              reduceMotion ? { duration: 0.12 } : softSpring
            }
            className="fixed inset-y-0 start-0 z-50 flex h-dvh max-h-dvh w-[min(100dvw,18.5rem)] flex-col overflow-hidden bg-sidebar text-sidebar-foreground shadow-[var(--shadow-card-hover)] lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label={t("common.navDrawer")}
          >
            <div className="flex min-h-14 shrink-0 items-center justify-between border-b border-sidebar-border px-4 pt-[env(safe-area-inset-top,0px)]">
              <BrandMark />
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-sidebar-foreground hover:bg-sidebar-accent"
                onClick={() => setMobileMenuOpen(false)}
                aria-label={t("common.closeMenu")}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="drawer-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <div className="mb-3">
                <SidebarDailyPlan
                  className="mx-0 mt-0"
                  onNavigate={() => setMobileMenuOpen(false)}
                />
              </div>
              <nav className="space-y-1 pb-2">
                {items.map((item) => {
                  const active =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  const badgeCount =
                    item.badge && item.key === "leave" && showLeaveReviewBadge
                      ? pendingLeave
                      : item.badge && item.key === "clientRequests"
                        ? openClientRequests
                        : 0;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "relative flex min-h-11 touch-manipulation items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
                        active
                          ? "bg-white text-sidebar shadow-md shadow-black/20"
                          : "text-sidebar-foreground/65 hover:bg-white/[0.06] hover:text-white"
                      )}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon
                        className={cn(
                          "relative z-10 h-4 w-4 shrink-0",
                          active ? "text-primary" : undefined
                        )}
                      />
                      <span className="relative z-10 flex min-w-0 flex-1 items-center justify-between gap-2">
                        <span className="truncate">
                          {item.key === "tasks" && showTasksAdminLabel
                            ? t("nav.tasksAdmin")
                            : t(`nav.${item.key}`)}
                        </span>
                        {badgeCount > 0 ? (
                          <span
                            className={cn(
                              "shrink-0 rounded-md px-1.5 py-0.5 font-mono text-xs font-semibold",
                              active
                                ? "bg-primary/12 text-primary"
                                : "bg-sky-400/20 text-sky-100"
                            )}
                          >
                            {badgeCount}
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
