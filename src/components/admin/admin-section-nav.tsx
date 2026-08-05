"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  Bell,
  Building2,
  CalendarDays,
  ClipboardCheck,
  Database,
  Home,
  MapPin,
  Briefcase,
  Palette,
  Shield,
  SlidersHorizontal,
  Timer,
  Users,
} from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import { layoutSpring } from "@/lib/animations";
import { cn } from "@/lib/utils";
import type { AdminSection } from "@/components/admin/admin-mock-data";
import type { TranslationPath } from "@/i18n";

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
  { id: "appearance", labelKey: "admin.navAppearance", icon: Palette },
  { id: "demo", labelKey: "admin.navDemo", icon: Database },
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

  return (
    <nav
      aria-label={t("admin.navLabel")}
      className="surface-panel overflow-hidden"
    >
      <div className="border-b border-border/60 px-4 py-3">
        <p className="section-label text-primary/70">{t("admin.controlCenter")}</p>
        <p className="mt-1 text-sm font-semibold tracking-tight">
          {t("admin.navTitle")}
        </p>
      </div>
      <ul className="grid gap-0.5 p-2 sm:grid-cols-2 lg:grid-cols-1">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onChange(item.id)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-start text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "bg-primary/[0.08] text-primary"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
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
