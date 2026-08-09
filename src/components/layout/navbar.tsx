"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { motion, useReducedMotion } from "framer-motion";
import { LogOut, Menu, Moon, Search, Sun, User } from "lucide-react";
import { format } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { NotificationsPopover } from "@/components/layout/notifications-popover";
import { useUiStore } from "@/stores/ui-store";
import { useSessionStore } from "@/stores/session-store";
import { useAttendanceStore } from "@/stores/attendance-store";
import { signOutSession } from "@/services/auth.service";
import { saveUserPreferences } from "@/services/user-preferences.service";
import { useTranslation } from "@/hooks/use-translation";
import { Badge } from "@/components/ui/badge";
import { demoNow } from "@/lib/mock-date";

export function Navbar() {
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const { setMobileMenuOpen, sidebarCollapsed } = useUiStore();
  const user = useSessionStore((s) => s.user);
  const authenticated = useSessionStore((s) => s.authenticated);
  const role = useSessionStore((s) => s.role);
  const resetAttendance = useAttendanceStore((s) => s.reset);
  const { t, locale, isRtl } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(() => demoNow());

  useEffect(() => {
    setMounted(true);
    setNow(demoNow());
    const id = setInterval(() => setNow(demoNow()), 30000);
    return () => clearInterval(id);
  }, []);

  const dateLocale = locale === "ar" ? arLocale : enUS;

  function toggleTheme() {
    const next = resolvedTheme === "dark" ? "light" : "dark";
    setTheme(next);
    if (authenticated && user.id) {
      void saveUserPreferences(user.id, { appearance: next });
    }
  }

  async function handleSignOut() {
    resetAttendance();
    await signOutSession();
    router.replace("/login");
  }

  return (
    <motion.header
      initial={reduceMotion ? false : { y: -6, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-30 chrome-bar"
    >
      <div className="flex h-[3.4rem] min-w-0 items-center gap-1.5 px-3 sm:gap-2.5 sm:px-4 md:px-6 lg:px-8">
        <Button
          variant="ghost"
          size="icon-sm"
          className="lg:hidden"
          onClick={() => setMobileMenuOpen(true)}
          aria-label={t("common.openMenu")}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="relative hidden max-w-sm flex-1 md:block">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/80" />
          <Input
            placeholder={t("common.search")}
            className="h-9 border-border/55 bg-muted/40 ps-8 shadow-none transition-colors placeholder:text-muted-foreground/55 hover:bg-muted/55 focus-visible:border-primary/30 focus-visible:bg-card focus-visible:shadow-sm"
            aria-label={t("common.searchAria")}
            readOnly
            tabIndex={-1}
          />
        </div>

        <div className="ms-auto flex items-center gap-0.5 sm:gap-1">
          <div className="me-1.5 hidden rounded-xl border border-border/65 bg-gradient-to-b from-muted/55 to-muted/20 px-3 py-1.5 text-end shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] dark:shadow-none lg:block">
            <p className="text-[11px] font-semibold leading-none tracking-tight text-foreground">
              {format(now, "EEEE, d MMM", { locale: dateLocale })}
            </p>
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              {format(now, "h:mm a", { locale: dateLocale })} · {t("common.cairo")}
            </p>
          </div>

          <LanguageSwitcher />

          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("common.toggleTheme")}
            onClick={toggleTheme}
          >
            {mounted && resolvedTheme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          <NotificationsPopover />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-9 gap-2 rounded-lg border border-transparent px-1.5 hover:border-border/60 hover:bg-muted/50"
                aria-label={t("common.userMenu")}
              >
                <Avatar className="h-7 w-7 ring-1 ring-border">
                  <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                    {user.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden text-start md:block">
                  <p className="text-[13px] font-semibold leading-none">
                    {user.firstName || user.displayName}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {role === "admin" ? t("roles.admin") : t("roles.employee")}
                  </p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isRtl ? "start" : "end"} className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col gap-1">
                  <span>{user.displayName || user.firstName || user.email}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {user.email}
                  </span>
                  <Badge variant="info" className="mt-1 w-fit">
                    {user.employeeId}
                  </Badge>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/profile")}>
                <User className="me-2 h-4 w-4" />
                {t("common.profile")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleTheme}>
                {resolvedTheme === "dark" ? (
                  <Sun className="me-2 h-4 w-4" />
                ) : (
                  <Moon className="me-2 h-4 w-4" />
                )}
                {t("common.toggleTheme")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void handleSignOut()}>
                <LogOut className="me-2 h-4 w-4" />
                {t("auth.signOut")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <span className="sr-only">
          {sidebarCollapsed
            ? t("common.collapseSidebar")
            : t("common.expandSidebar")}
        </span>
      </div>
    </motion.header>
  );
}
