"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Bell,
  Building2,
  CalendarDays,
  ClipboardCheck,
  Database,
  Home,
  KeyRound,
  LayoutGrid,
  MapPin,
  Briefcase,
  Palette,
  Shield,
  SlidersHorizontal,
  Timer,
  UserRound,
  Users,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  { id: "accounts", labelKey: "admin.navAccounts", icon: KeyRound },
  {
    id: "employeePrefs",
    labelKey: "admin.navEmployeePrefs",
    icon: SlidersHorizontal,
  },
  { id: "myPrefs", labelKey: "admin.navMyPrefs", icon: UserRound },
  { id: "appearance", labelKey: "admin.navAppearance", icon: Palette },
  { id: "demo", labelKey: "admin.navDemo", icon: Database },
];

const GROUPS: {
  labelKey: TranslationPath;
  ids: AdminSection[];
}[] = [
  {
    labelKey: "admin.groupCompany",
    ids: ["profile", "appearance", "demo"],
  },
  {
    labelKey: "admin.groupWork",
    ids: ["policies", "shifts", "wfh", "calendar"],
  },
  {
    labelKey: "admin.groupOrg",
    ids: ["departments", "positions", "locations"],
  },
  {
    labelKey: "admin.groupPeople",
    ids: ["notifications", "approvals", "accounts", "employeePrefs"],
  },
  {
    labelKey: "admin.groupPersonal",
    ids: ["myPrefs"],
  },
];

const MOBILE_QUICK: AdminSection[] = [
  "profile",
  "policies",
  "notifications",
  "appearance",
];

const ITEM_MAP = Object.fromEntries(ITEMS.map((item) => [item.id, item])) as Record<
  AdminSection,
  (typeof ITEMS)[number]
>;

export function AdminSectionNav({
  active,
  onChange,
}: {
  active: AdminSection;
  onChange: (section: AdminSection) => void;
}) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [sheetOpen, setSheetOpen] = useState(false);
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

  const visibleIds = useMemo(
    () => new Set(visibleItems.map((item) => item.id)),
    [visibleItems]
  );

  const quickItems = useMemo(() => {
    const preferred = MOBILE_QUICK.filter((id) => visibleIds.has(id));
    if (preferred.length >= 3) return preferred.slice(0, 4);
    return visibleItems.slice(0, 4).map((item) => item.id);
  }, [visibleIds, visibleItems]);

  const grouped = useMemo(
    () =>
      GROUPS.map((group) => ({
        ...group,
        items: group.ids
          .filter((id) => visibleIds.has(id))
          .map((id) => ITEM_MAP[id]),
      })).filter((group) => group.items.length > 0),
    [visibleIds]
  );

  const activeItem = ITEM_MAP[active];
  const ActiveIcon = activeItem.icon;

  function select(section: AdminSection) {
    onChange(section);
    setSheetOpen(false);
  }

  return (
    <>
      <div className="sticky top-[3.25rem] z-20 -mx-3 border-b border-border/50 bg-background/94 px-3 py-2 backdrop-blur-xl sm:top-[3.4rem] sm:-mx-4 sm:px-4 md:-mx-6 md:px-6 lg:hidden">
        <div
          className="flex items-center gap-1.5"
          role="tablist"
          aria-label={t("admin.navLabel")}
        >
          <div className="scroll-x flex min-w-0 flex-1 gap-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {quickItems.map((id) => {
              const item = ITEM_MAP[id];
              const Icon = item.icon;
              const isActive = active === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => select(id)}
                  className={cn(
                    "inline-flex min-h-11 shrink-0 touch-manipulation items-center gap-1.5 rounded-xl px-3 text-[12px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/55 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  <span className="max-w-[6.5rem] truncate">
                    {t(item.labelKey)}
                  </span>
                </button>
              );
            })}
            {!quickItems.includes(active) ? (
              <span className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-primary/12 px-3 text-[12px] font-semibold text-primary">
                <ActiveIcon className="h-3.5 w-3.5" aria-hidden />
                <span className="max-w-[6.5rem] truncate">
                  {t(activeItem.labelKey)}
                </span>
              </span>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-card text-foreground shadow-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-haspopup="dialog"
            aria-expanded={sheetOpen}
            aria-label={t("admin.allSections")}
          >
            <LayoutGrid className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="flex max-w-[min(100%,22rem)] flex-col gap-0 overflow-hidden p-0 lg:hidden">
          <SheetHeader className="border-b border-border/60 px-5 py-4">
            <SheetTitle>{t("admin.navTitle")}</SheetTitle>
            <SheetDescription>{t("admin.navLabel")}</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            {grouped.map((group) => (
              <div key={group.labelKey} className="mb-4">
                <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {t(group.labelKey)}
                </p>
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = active === item.id;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => select(item.id)}
                          aria-current={isActive ? "page" : undefined}
                          className={cn(
                            "flex min-h-12 w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-start text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            isActive
                              ? "bg-primary/[0.1] text-primary"
                              : "text-foreground/80 hover:bg-muted/50"
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
                              isActive
                                ? "border-primary/20 bg-primary/10"
                                : "border-border/70 bg-muted/40"
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
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <nav
        aria-label={t("admin.navLabel")}
        className="surface-panel hidden overflow-hidden lg:block"
      >
        <div className="border-b border-border/60 px-3 py-2.5 sm:px-4 sm:py-3">
          <p className="section-label text-primary/70">{t("admin.controlCenter")}</p>
          <p className="mt-1 text-sm font-semibold tracking-tight">
            {t("admin.navTitle")}
          </p>
        </div>
        <ul className="space-y-0.5 p-2">
          {visibleItems.map((item) => {
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
                  <span className="truncate">{t(item.labelKey)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
