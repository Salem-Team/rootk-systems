import { Target } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "@/hooks/use-translation";
import type { TargetCategory, TargetDashboardStats } from "@/types/targets";
import { CategoryChip, CategoryRow } from "./target-hub-category-row";

function countForCategory(
  stats: TargetDashboardStats | null,
  categoryId: string
): number {
  if (!stats) return 0;
  return stats.byCategory.find((c) => c.id === categoryId)?.count ?? 0;
}

export function TargetHubCategoryList({
  activeCategories,
  inactiveCategories,
  selectedCategoryId,
  onCategoryChange,
  stats,
  canManageCatalog,
}: {
  activeCategories: TargetCategory[];
  inactiveCategories: TargetCategory[];
  selectedCategoryId: string;
  onCategoryChange: (categoryId: string) => void;
  stats: TargetDashboardStats | null;
  canManageCatalog: boolean;
}) {
  const { t } = useTranslation();
  const totalCount = stats?.total ?? 0;
  const allSelected = !selectedCategoryId;

  return (
    <>
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
    </>
  );
}
