"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  Bell,
  Building2,
  CalendarDays,
  ClipboardCheck,
  Database,
  Home,
  KeyRound,
  MapPin,
  Briefcase,
  Palette,
  Shield,
  SlidersHorizontal,
  Timer,
  UserRound,
  Users,
} from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import { layoutSpring } from "@/lib/animations";
import { cn } from "@/lib/utils";
import type { AdminSection } from "@/components/admin/admin-mock-data";
import type { TranslationPath } from "@/i18n";
import {
  ADMIN_SECTION_PERMISSION,
  hasPermissionId,
  type PermissionId,
} from "@/constants/permissions";
import { useSessionStore } from "@/stores/session-store";

const ITEMS: {
  id: AdminSection;
  labelKey: TranslationPath;
  icon: typeof Building2;
}[] = [
  { id: "profile", labelKey: "admin.navProfile", icon: Building2 },
  { id: "policies", labelKey: "admin.navPolicies", icon: Shield },
  { id: "shifts", labelKey: "admin.navShifts", icon: Timer },
  { id: "wfh", labelKey: "admin.navWfh", icon: Home },
  { id: "departments", labelKey: "admin.navDepartments", icon: Users },
  { id: "positions", labelKey: "admin.navPositions", icon: Briefcase },
  { id: "locations", labelKey: "admin.navLocations", icon: MapPin },
  { id: "calendar", labelKey: "admin.navCalendar", icon: CalendarDays },
  { id: "notifications", labelKey: "admin.navNotifications", icon: Bell },
  { id: "approvals", labelKey: "admin.navApprovals", icon: ClipboardCheck },
  {
    id: "employeePrefs",
    labelKey: "admin.navEmployeePrefs",
    icon: SlidersHorizontal,
  },
  { id: "myPrefs", labelKey: "admin.navMyPrefs", icon: UserRound },
  { id: "appearance", labelKey: "admin.navAppearance", icon: Palette },
  { id: "demo", labelKey: "admin.navDemo", icon: Database },
  { id: "permissions", labelKey: "admin.navPermissions", icon: KeyRound },
];

export function AdminSectionNav({
  active,
  onChange,
}: {
  active: AdminSection;
  onChange: (section: AdminSection) => void;
}) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const permissions = useSessionStore((s) => s.permissions);
  const role = useSessionStore((s) => s.role);
  const visibleItems = ITEMS.filter((item) => {
    const required = ADMIN_SECTION_PERMISSION[item.id] as
      | PermissionId
      | null
      | undefined;
    if (!required) return true;
    return hasPermissionId(required, permissions, role);
  });

  return (
    <nav
      aria-label={t("admin.navLabel")}
      className="surface-panel overflow-hidden"
    >
      <div className="border-b border-border/60 px-3 py-2.5 sm:px-4 sm:py-3">
        <p className="section-label text-primary/70">{t("admin.controlCenter")}</p>
        <p className="mt-1 text-sm font-semibold tracking-tight">
          {t("admin.navTitle")}
        </p>
      </div>
      <ul className="scroll-x flex gap-1 p-2 [scrollbar-width:none] lg:grid lg:grid-cols-1 lg:gap-0.5 lg:overflow-visible [&::-webkit-scrollbar]:hidden">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <li key={item.id} className="shrink-0 lg:shrink lg:w-full">
              <button
                type="button"
                onClick={() => onChange(item.id)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group relative flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-start text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-[13px] lg:gap-2.5",
                  isActive
                    ? "bg-primary/[0.08] text-primary"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted/50 hover:text-foreground lg:bg-transparent"
                )}
              >
                {isActive ? (
                  reduceMotion ? (
                    <span className="absolute inset-y-1 start-0 w-0.5 rounded-full bg-primary" />
                  ) : (
                    <motion.span
                      layoutId="admin-nav-active"
                      className="absolute inset-y-1 start-0 w-0.5 rounded-full bg-primary"
                      transition={layoutSpring}
                    />
                  )
                ) : null}
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-md border transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100",
                    isActive
                      ? "border-primary/15 bg-primary/10"
                      : "border-border/70 bg-muted/40 group-hover:border-border"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                </span>
                {t(item.labelKey)}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
