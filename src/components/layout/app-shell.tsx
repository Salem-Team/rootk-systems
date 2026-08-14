"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import { UserViewBanner } from "@/components/layout/user-view-banner";
import {
  MobileBottomNav,
  MobileDrawer,
} from "@/components/layout/mobile-nav";
import { AuthGate } from "@/components/layout/auth-gate";
import { RoleRedirect } from "@/components/layout/role-redirect";
import { RouteProgress } from "@/components/layout/route-progress";
import { PreferenceSync } from "@/components/shared/preference-sync";
import { useUiStore } from "@/stores/ui-store";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";

/**
 * App chrome (sidebar + navbar). Page enter polish lives in PageTransition /
 * `.page-cascade` — do NOT wrap route children in Framer AnimatePresence+opacity
 * here: interrupted client navigations leave the main pane stuck at opacity 0
 * (white screen while chrome still works).
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useUiStore();
  const { t } = useTranslation();

  return (
    <AuthGate>
      <PreferenceSync />
      <div className="min-h-dvh bg-background">
        <a href="#main-content" className="skip-link">
          {t("a11y.skipToContent")}
        </a>
        <RouteProgress />
        <RoleRedirect />
        <Sidebar />
        <MobileDrawer />
        <div
          className={cn(
            "min-h-dvh transition-[padding] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
            sidebarCollapsed ? "lg:ps-[72px]" : "lg:ps-[252px]"
          )}
        >
          <Navbar />
          <UserViewBanner />
          <main
            id="main-content"
            tabIndex={-1}
            aria-label={t("a11y.mainContent")}
            className="min-w-0 px-3 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-4 sm:px-4 sm:pt-5 md:px-6 md:pt-6 lg:px-8 lg:pb-12 lg:pt-7"
          >
            <div className="content-frame min-w-0">{children}</div>
          </main>
        </div>
        <MobileBottomNav />
      </div>
    </AuthGate>
  );
}
