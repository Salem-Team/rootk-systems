"use client";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import type { TeamActivityRow, TeamActivitySort } from "@/types/organic-ads";

interface TeamActivityProps {
  rows: TeamActivityRow[];
  sort: TeamActivitySort;
  onSortChange: (sort: TeamActivitySort) => void;
  onSelectEmployee?: (employeeId: string) => void;
}

export function TeamActivity({
  rows,
  sort,
  onSortChange,
  onSelectEmployee,
}: TeamActivityProps) {
  const { t } = useTranslation();
  const max = Math.max(...rows.map((r) => r.adsCount), 1);

  return (
    <section className="surface-panel flex h-full flex-col">
      <div className="panel-header flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-tight">
          {t("organicAds.teamActivity.title")}
        </h2>
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant={sort === "ads" ? "secondary" : "ghost"}
            onClick={() => onSortChange("ads")}
          >
            {t("organicAds.teamActivity.sortAds")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={sort === "last_activity" ? "secondary" : "ghost"}
            onClick={() => onSortChange("last_activity")}
          >
            {t("organicAds.teamActivity.sortLast")}
          </Button>
        </div>
      </div>

      <div className="flex-1 p-3 sm:p-4">
        {rows.length === 0 ? (
          <EmptyState
            compact
            title={t("organicAds.teamActivity.empty")}
            description={t("organicAds.teamActivity.emptyDesc")}
          />
        ) : (
          <ul className="grid gap-2.5">
            {rows.map((row) => {
              const width = Math.max(8, Math.round((row.adsCount / max) * 100));
              return (
                <li key={row.employeeId}>
                  <button
                    type="button"
                    onClick={() => onSelectEmployee?.(row.employeeId)}
                    className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-1 py-1.5 text-start transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[13px] font-medium">
                          {row.name}
                        </span>
                      </div>
                      <div
                        className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted"
                        aria-hidden
                      >
                        <div
                          className={cn(
                            "h-full rounded-full bg-primary/80 transition-all",
                            row.weeklyCount < row.weeklyTarget && "bg-amber-500/80"
                          )}
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                    <span className="font-mono text-sm tabular-nums text-foreground">
                      {row.adsCount}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
