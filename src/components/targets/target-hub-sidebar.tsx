"use client";

import { useMemo } from "react";
import { Tags } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import type { TargetCategory, TargetDashboardStats } from "@/types/targets";
import { TargetHubCategoryList } from "./target-hub-category-list";
import { TargetHubNavList } from "./target-hub-nav-list";

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

  const { activeCategories, inactiveCategories } = useMemo(() => {
    const sorted = [...categories].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
    );
    return {
      activeCategories: sorted.filter((c) => c.active),
      inactiveCategories: sorted.filter((c) => !c.active),
    };
  }, [categories]);

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

      <TargetHubNavList
        tab={tab}
        onTabChange={onTabChange}
        canManageCatalog={canManageCatalog}
        canViewReports={canViewReports}
      />

      <div className="border-t border-border/60">
        <div className="flex items-center justify-between gap-2 px-4 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {t("targets.sidebar.categories")}
          </p>
          <span className="rounded-md bg-muted/70 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-muted-foreground">
            {activeCategories.length}
          </span>
        </div>

        <TargetHubCategoryList
          activeCategories={activeCategories}
          inactiveCategories={inactiveCategories}
          selectedCategoryId={selectedCategoryId}
          onCategoryChange={onCategoryChange}
          stats={stats}
          canManageCatalog={canManageCatalog}
        />
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
