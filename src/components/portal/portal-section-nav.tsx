"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Award,
  Bell,
  CalendarDays,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LayoutGrid,
  LineChart,
  Plane,
  Timer,
  User,
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
import { cn } from "@/lib/utils";
import type { PortalSection } from "@/components/portal/portal-mock-data";
import type { TranslationPath } from "@/i18n";

const ITEMS: {
  id: PortalSection;
  labelKey: TranslationPath;
  icon: typeof LayoutDashboard;
}[] = [
  { id: "overview", labelKey: "portal.navOverview", icon: LayoutDashboard },
  { id: "profile", labelKey: "portal.navProfile", icon: User },
  { id: "attendance", labelKey: "portal.navAttendance", icon: Timer },
  { id: "leave", labelKey: "portal.navLeave", icon: Plane },
  { id: "requests", labelKey: "portal.navRequests", icon: ClipboardList },
  { id: "documents", labelKey: "portal.navDocuments", icon: FileText },
  { id: "notifications", labelKey: "portal.navNotifications", icon: Bell },
  { id: "team", labelKey: "portal.navTeam", icon: Users },
  { id: "manager", labelKey: "portal.navManager", icon: UserRound },
  { id: "timeline", labelKey: "portal.navTimeline", icon: LineChart },
  { id: "events", labelKey: "portal.navEvents", icon: CalendarDays },
  { id: "achievements", labelKey: "portal.navAchievements", icon: Award },
  { id: "stats", labelKey: "portal.navStats", icon: LineChart },
];

const GROUPS: {
  labelKey: TranslationPath;
  ids: PortalSection[];
}[] = [
  {
    labelKey: "portal.groupDaily",
    ids: ["overview", "attendance", "leave", "requests"],
  },
  {
    labelKey: "portal.groupMe",
    ids: ["profile", "documents", "notifications", "stats"],
  },
  {
    labelKey: "portal.groupPeople",
    ids: ["team", "manager"],
  },
  {
    labelKey: "portal.groupMore",
    ids: ["timeline", "events", "achievements"],
  },
];

const MOBILE_QUICK: PortalSection[] = [
  "overview",
  "attendance",
  "leave",
  "profile",
];

const ITEM_MAP = Object.fromEntries(ITEMS.map((item) => [item.id, item])) as Record<
  PortalSection,
  (typeof ITEMS)[number]
>;

export function PortalSectionNav({
  active,
  onChange,
}: {
  active: PortalSection;
  onChange: (s: PortalSection) => void;
}) {
  const { t } = useTranslation();
  const [sheetOpen, setSheetOpen] = useState(false);
  const activeItem = ITEM_MAP[active];
  const ActiveIcon = activeItem.icon;

  const grouped = useMemo(
    () =>
      GROUPS.map((group) => ({
        ...group,
        items: group.ids.map((id) => ITEM_MAP[id]),
      })),
    []
  );

  function select(section: PortalSection) {
    onChange(section);
    setSheetOpen(false);
  }

  return (
    <>
      {/* Mobile: single compact sticky strip */}
      <div className="sticky top-14 z-20 -mx-3 border-b border-border/50 bg-background/94 px-3 py-2 backdrop-blur-xl sm:-mx-4 sm:px-4 lg:hidden">
        <div
          className="flex items-center gap-1"
          role="tablist"
          aria-label={t("portal.navLabel")}
        >
          <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {MOBILE_QUICK.map((id) => {
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
                    "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-3 text-[12px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  <span className="max-w-[5.5rem] truncate">{t(item.labelKey)}</span>
                </button>
              );
            })}
            {!MOBILE_QUICK.includes(active) ? (
              <span className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-primary/12 px-3 text-[12px] font-semibold text-primary">
                <ActiveIcon className="h-3.5 w-3.5" aria-hidden />
                <span className="max-w-[5.5rem] truncate">
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
            aria-label={t("portal.allSections")}
          >
            <LayoutGrid className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="max-w-[min(100%,22rem)] gap-0 p-0 lg:hidden">
          <SheetHeader className="border-b border-border/60 px-5 py-4">
            <SheetTitle>{t("portal.navTitle")}</SheetTitle>
            <SheetDescription>{t("portal.navLabel")}</SheetDescription>
          </SheetHeader>
          <div className="overflow-y-auto px-3 py-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
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

      {/* Desktop sidebar */}
      <nav
        aria-label={t("portal.navLabel")}
        className="surface-panel hidden overflow-hidden lg:block"
      >
        <div className="border-b border-border/60 px-4 py-3">
          <p className="section-label text-primary/70">{t("portal.controlCenter")}</p>
          <p className="mt-1 text-sm font-semibold tracking-tight">
            {t("portal.navTitle")}
          </p>
        </div>
        <div className="space-y-3 p-2">
          {grouped.map((group) => (
            <div key={group.labelKey}>
              <p className="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
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
                          <motion.span
                            layoutId="portal-nav-active"
                            className="absolute inset-y-1 start-0 w-0.5 rounded-full bg-primary"
                            transition={{
                              type: "spring",
                              stiffness: 420,
                              damping: 34,
                            }}
                          />
                        ) : null}
                        <span
                          className={cn(
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border",
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
            </div>
          ))}
        </div>
      </nav>
    </>
  );
}
