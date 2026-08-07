"use client";

import { useMemo, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  Clock3,
  Gauge,
  LayoutDashboard,
  ListChecks,
  Tags,
  Target,
  type LucideIcon,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import type { TargetCategory, TargetDashboardStats } from "@/types/targets";

export type TargetHubTab =
  | "dashboard"
  | "targets"
  | "performance"
  | "catalog"
  | "warnings"
  | "delayed";

interface TargetHubSidebarProps {
  tab: TargetHubTab;
  onTabChange: (tab: TargetHubTab) => void;
  categories: TargetCategory[];
  selectedCategoryId: string;
  onCategoryChange: (categoryId: string) => void;
  stats: TargetDashboardStats | null;
  canManageCatalog?: boolean;
  canViewReports?: boolean;
  className?: string;
}

const VIEW_ITEMS: {
  id: TargetHubTab;
  icon: LucideIcon;
  labelKey:
    | "targets.nav.dashboard"
    | "targets.nav.targets"
    | "targets.nav.performance"
    | "targets.nav.catalog"
    | "targets.nav.warnings"
    | "targets.nav.delayed";
  adminOnly?: boolean;
  reportsOnly?: boolean;
}[] = [
  { id: "dashboard", icon: LayoutDashboard, labelKey: "targets.nav.dashboard" },
  { id: "targets", icon: ListChecks, labelKey: "targets.nav.targets" },
  {
    id: "performance",
    icon: Gauge,
    labelKey: "targets.nav.performance",
    reportsOnly: true,
  },
  {
    id: "catalog",
    icon: Tags,
    labelKey: "targets.nav.catalog",
    adminOnly: true,
  },
  { id: "warnings", icon: AlertTriangle, labelKey: "targets.nav.warnings" },
  { id: "delayed", icon: Clock3, labelKey: "targets.nav.delayed" },
];

function countForCategory(
  stats: TargetDashboardStats | null,
  categoryId: string
): number {
  if (!stats) return 0;
  return stats.byCategory.find((c) => c.id === categoryId)?.count ?? 0;
}

/** In-module rail: hub views + live category filter from catalog/API. */
export function TargetHubSidebar({
  tab,
  onTabChange,
  categories,
  selectedCategoryId,
  onCategoryChange,
  stats,
  canManageCatalog = false,
  canViewReports = false,
  className,
}: TargetHubSidebarProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

  const { activeCategories, inactiveCategories } = useMemo(() => {
    const sorted = [...categories].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
    );
    return {
      activeCategories: sorted.filter((c) => c.active),
      inactiveCategories: sorted.filter((c) => !c.active),
    };
  }, [categories]);

  const views = VIEW_ITEMS.filter((item) => {
    if (item.reportsOnly) return canViewReports;
    if (item.adminOnly) return canManageCatalog;
    return true;
  });

  const totalCount = stats?.total ?? 0;
  const allSelected = !selectedCategoryId;

  return (
    <nav
      aria-label={t("targets.sidebar.label")}
      className={cn("surface-panel overflow-hidden", className)}
    >
      <div className="hidden border-b border-border/60 px-4 py-3 lg:block">
        <p className="section-label text-primary/70">
          {t("targets.page.eyebrow")}
        </p>
        <p className="mt-1 text-sm font-semibold tracking-tight">
          {t("targets.sidebar.views")}
        </p>
      </div>

      <ul className="flex gap-1 overflow-x-auto p-2 [scrollbar-width:none] lg:grid lg:gap-0.5 lg:overflow-visible [&::-webkit-scrollbar]:hidden">
        {views.map((item) => {
          const Icon = item.icon;
          const isActive = tab === item.id;
          return (
            <li key={item.id} className="shrink-0 lg:w-full">
              <button
                type="button"
                onClick={() => onTabChange(item.id)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-start text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:rounded-lg lg:px-2.5 lg:py-2",
                  isActive
                    ? "bg-primary/[0.08] text-primary"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                {isActive && !reduceMotion ? (
                  <motion.span
                    layoutId="targets-hub-nav"
                    className="absolute inset-y-1 start-0 hidden w-0.5 rounded-full bg-primary lg:block"
                    transition={{
                      type: "spring",
                      stiffness: 420,
                      damping: 34,
                    }}
                  />
                ) : isActive ? (
                  <span className="absolute inset-y-1 start-0 hidden w-0.5 rounded-full bg-primary lg:block" />
                ) : null}
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg border lg:h-7 lg:w-7 lg:rounded-md",
                    isActive
                      ? "border-primary/15 bg-primary/10"
                      : "border-border/70 bg-muted/40"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                </span>
                <span className="whitespace-nowrap">{t(item.labelKey)}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-border/60">
        <div className="flex items-center justify-between gap-2 px-4 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {t("targets.sidebar.categories")}
          </p>
          <span className="rounded-md bg-muted/70 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-muted-foreground">
            {activeCategories.length}
          </span>
        </div>

        {/* Mobile chips */}
        <div className="flex gap-1.5 overflow-x-auto px-2 pb-2 lg:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <CategoryChip
            label={t("targets.sidebar.allCategories")}
            count={totalCount}
            selected={allSelected}
            onClick={() => onCategoryChange("")}
          />
          {activeCategories.map((cat) => (
            <CategoryChip
              key={cat.id}
              label={cat.name}
              count={countForCategory(stats, cat.id)}
              selected={selectedCategoryId === cat.id}
              onClick={() => onCategoryChange(cat.id)}
              color={cat.color}
            />
          ))}
          {canManageCatalog
            ? inactiveCategories.map((cat) => (
                <CategoryChip
                  key={cat.id}
                  label={cat.name}
                  count={countForCategory(stats, cat.id)}
                  selected={selectedCategoryId === cat.id}
                  onClick={() => onCategoryChange(cat.id)}
                  color={cat.color}
                  muted
                />
              ))
            : null}
        </div>

        {/* Desktop list */}
        <ScrollArea className="hidden max-h-[min(42vh,360px)] lg:block">
          <ul className="grid gap-0.5 px-2 pb-2">
            <li>
              <CategoryRow
                label={t("targets.sidebar.allCategories")}
                count={totalCount}
                selected={allSelected}
                onClick={() => onCategoryChange("")}
                leading={
                  <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border/70 bg-muted/40 text-muted-foreground">
                    <Target className="h-3.5 w-3.5" aria-hidden />
                  </span>
                }
              />
            </li>

            {activeCategories.length === 0 ? (
              <li className="px-2.5 py-3 text-[12px] leading-relaxed text-muted-foreground">
                {t("targets.sidebar.emptyCategories")}
              </li>
            ) : (
              activeCategories.map((cat) => (
                <li key={cat.id}>
                  <CategoryRow
                    label={cat.name}
                    count={countForCategory(stats, cat.id)}
                    selected={selectedCategoryId === cat.id}
                    onClick={() => onCategoryChange(cat.id)}
                    leading={
                      <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-background">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: cat.color || "#082868" }}
                          aria-hidden
                        />
                      </span>
                    }
                  />
                </li>
              ))
            )}

            {canManageCatalog && inactiveCategories.length > 0 ? (
              <>
                <li className="px-2.5 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground/70">
                  {t("targets.sidebar.inactive")}
                </li>
                {inactiveCategories.map((cat) => (
                  <li key={cat.id}>
                    <CategoryRow
                      label={cat.name}
                      count={countForCategory(stats, cat.id)}
                      selected={selectedCategoryId === cat.id}
                      onClick={() => onCategoryChange(cat.id)}
                      muted
                      leading={
                        <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border/50 bg-muted/30 opacity-70">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: cat.color || "#082868" }}
                            aria-hidden
                          />
                        </span>
                      }
                    />
                  </li>
                ))}
              </>
            ) : null}
          </ul>
        </ScrollArea>
      </div>

      {canManageCatalog ? (
        <div className="hidden border-t border-border/60 p-2 lg:block">
          <button
            type="button"
            onClick={() => onTabChange("catalog")}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            <Tags className="h-3.5 w-3.5" aria-hidden />
            {t("targets.sidebar.manageCatalog")}
          </button>
        </div>
      ) : null}
    </nav>
  );
}

function CategoryChip({
  label,
  count,
  selected,
  onClick,
  color,
  muted = false,
}: {
  label: string;
  count: number;
  selected: boolean;
  onClick: () => void;
  color?: string;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[12px] font-medium transition-colors",
        selected
          ? "border-primary/25 bg-primary/[0.1] text-primary"
          : muted
            ? "border-border/60 bg-muted/40 text-muted-foreground"
            : "border-border/70 bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      )}
      aria-pressed={selected}
    >
      {color ? (
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden
        />
      ) : null}
      <span>{label}</span>
      <span className="font-mono text-[10px] opacity-80">{count}</span>
    </button>
  );
}

function CategoryRow({
  label,
  count,
  selected,
  onClick,
  leading,
  muted = false,
}: {
  label: string;
  count: number;
  selected: boolean;
  onClick: () => void;
  leading: ReactNode;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-start text-[13px] transition-colors",
        selected
          ? "bg-muted font-semibold text-foreground"
          : muted
            ? "text-muted-foreground/75 hover:bg-muted/40 hover:text-muted-foreground"
            : "font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      )}
      aria-pressed={selected}
    >
      {leading}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span
        className={cn(
          "rounded-md px-1.5 py-0.5 font-mono text-[10px] tabular-nums",
          selected
            ? "bg-background/80 text-foreground/70"
            : "text-muted-foreground/70"
        )}
      >
        {count}
      </span>
    </button>
  );
}
