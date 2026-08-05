"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { BrandMark } from "@/components/layout/brand-mark";
import { APP_NAV, MOBILE_NAV, navForRole } from "@/constants/navigation";
import { useUiStore } from "@/stores/ui-store";
import { useSessionStore } from "@/stores/session-store";
import { usePendingLeaveCount } from "@/hooks/use-pending-leave-count";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { layoutSpring, softSpring } from "@/lib/animations";

export function MobileBottomNav() {
  const pathname = usePathname();
  const role = useSessionStore((s) => s.role);
  const setMobileMenuOpen = useUiStore((s) => s.setMobileMenuOpen);
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const items = navForRole(role, MOBILE_NAV);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.55rem,env(safe-area-inset-bottom))] pt-2 lg:hidden"
      aria-label={t("common.mobileNav")}
    >
      <ul
        className={cn(
          "mx-auto grid max-w-lg gap-0.5 rounded-2xl border border-border/65 bg-card/92 p-1.5 shadow-[var(--shadow-float)] backdrop-blur-2xl supports-[backdrop-filter]:bg-card/80",
          items.length <= 4 ? "grid-cols-4" : "grid-cols-5"
        )}
      >
        {items.map((item) => {
          const isMore = item.key === "more";
          const active = isMore
            ? false
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = isMore ? Menu : item.icon;

          if (isMore) {
            return (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  className="relative flex min-h-[3.35rem] w-full flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                  aria-label={t("common.openMenu")}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted/70">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span>{t(`nav.${item.key}`)}</span>
                </button>
              </li>
            );
          }

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "relative flex min-h-[3.35rem] flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-current={active ? "page" : undefined}
              >
                {active ? (
                  reduceMotion ? (
                    <span className="absolute inset-x-1 top-1 h-[2.65rem] rounded-xl bg-primary/12" />
                  ) : (
                    <motion.span
                      layoutId="mobile-nav-active"
                      className="absolute inset-x-1 top-1 h-[2.65rem] rounded-xl bg-primary/12"
                      transition={layoutSpring}
                    />
                  )
                ) : null}
                <motion.span
                  className="relative z-10 flex h-8 w-8 items-center justify-center"
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
                </motion.span>
                <span className="relative z-10 max-w-full truncate text-[11px]">
                  {item.key === "tasks" && role === "admin"
                    ? t("nav.tasksAdmin")
                    : t(`nav.${item.key}`)}
                </span>
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
  const { mobileMenuOpen, setMobileMenuOpen } = useUiStore();
  const role = useSessionStore((s) => s.role);
  const pendingLeave = usePendingLeaveCount();
  const { t, isRtl } = useTranslation();
  const reduceMotion = useReducedMotion();
  const items = navForRole(role, APP_NAV);

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
            }            className="fixed inset-y-0 start-0 z-50 w-[min(100%,280px)] bg-sidebar text-sidebar-foreground shadow-[var(--shadow-card-hover)] lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label={t("common.navDrawer")}
          >
            <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
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
            <ScrollArea className="h-[calc(100vh-3.5rem)] px-3 py-4">
              <nav className="space-y-1">
                {items.map((item) => {
                  const active =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  const badgeCount =
                    item.badge && item.key === "leave" && role === "admin"
                      ? pendingLeave
                      : 0;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "relative flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
                        active
                          ? "bg-white text-sidebar shadow-md shadow-black/20"
                          : "text-sidebar-foreground/65 hover:bg-white/[0.06] hover:text-white"
                      )}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon
                        className={cn(
                          "relative z-10 h-4 w-4",
                          active ? "text-primary" : undefined
                        )}
                      />
                      <span className="relative z-10 flex flex-1 items-center justify-between gap-2">
                        {item.key === "tasks" && role === "admin"
                          ? t("nav.tasksAdmin")
                          : t(`nav.${item.key}`)}
                        {badgeCount > 0 ? (
                          <span
                            className={cn(
                              "rounded-md px-1.5 py-0.5 font-mono text-xs font-semibold",
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
            </ScrollArea>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
