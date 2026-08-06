"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import {
  MobileBottomNav,
  MobileDrawer,
} from "@/components/layout/mobile-nav";
import { AuthGate } from "@/components/layout/auth-gate";
import { RoleRedirect } from "@/components/layout/role-redirect";
import { RouteProgress } from "@/components/layout/route-progress";
import { PreferenceSync } from "@/components/shared/preference-sync";
import { useUiStore } from "@/stores/ui-store";
import { useSessionStore } from "@/stores/session-store";
import { pageTransitionSoft } from "@/lib/animations";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useUiStore();
  const pathname = usePathname();
  const role = useSessionStore((s) => s.role);
  const userId = useSessionStore((s) => s.user.id);
  const reduceMotion = useReducedMotion();
  const { t } = useTranslation();

  return (
    <AuthGate>
      <PreferenceSync />
      <div className="min-h-screen overflow-x-clip bg-background">
        <a href="#main-content" className="skip-link">
          {t("a11y.skipToContent")}
        </a>
        <RouteProgress />
        <RoleRedirect />
        <Sidebar />
        <MobileDrawer />
        <div
          className={cn(
            "min-h-screen transition-[padding] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
            sidebarCollapsed ? "lg:ps-[72px]" : "lg:ps-[252px]"
          )}
        >
          <Navbar />
          <main
            id="main-content"
            tabIndex={-1}
            aria-label={t("a11y.mainContent")}
            className="min-w-0 overflow-x-clip px-3 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-4 sm:px-4 sm:pt-5 md:px-6 md:pt-6 lg:px-8 lg:pb-12 lg:pt-7"
          >
            <div className="content-frame min-w-0">
              {reduceMotion ? (
                <div key={`${role}-${userId}-${pathname}`} className="min-w-0">
                  {children}
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${role}-${userId}-${pathname}`}
                    variants={pageTransitionSoft}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="min-w-0"
                  >
                    {children}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </main>
        </div>
        <MobileBottomNav />
      </div>
    </AuthGate>
  );
}
