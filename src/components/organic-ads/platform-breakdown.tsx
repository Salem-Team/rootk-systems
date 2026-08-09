"use client";

import { EmptyState } from "@/components/shared/empty-state";
import { useTranslation } from "@/hooks/use-translation";
import type { PlatformBreakdownRow } from "@/types/organic-ads";

export function PlatformBreakdown({
  rows,
  onSelect,
}: {
  rows: PlatformBreakdownRow[];
  onSelect?: (platform: PlatformBreakdownRow["platform"]) => void;
}) {
  const { t } = useTranslation();
  const max = Math.max(...rows.map((r) => r.count), 1);

  return (
    <section className="surface-panel">
      <div className="panel-header">
        <h2 className="text-sm font-semibold tracking-tight">
          {t("organicAds.platforms.title")}
        </h2>
      </div>
      <div className="p-3 sm:p-4">
        {rows.length === 0 ? (
          <EmptyState compact title={t("organicAds.platforms.empty")} />
        ) : (
          <ul className="grid gap-2">
            {rows.map((row) => (
              <li key={row.platform}>
                <button
                  type="button"
                  onClick={() => onSelect?.(row.platform)}
                  className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-1 py-1.5 text-start hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-medium">
                        {t(`organicAds.platform.${row.platform}`)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary/70"
                        style={{
                          width: `${Math.max(6, Math.round((row.count / max) * 100))}%`,
                        }}
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {row.activeSales} {t("organicAds.platforms.sales")} ·{" "}
                      {row.projects} {t("organicAds.platforms.projects")}
                    </p>
                  </div>
                  <span className="font-mono text-sm tabular-nums">
                    {row.count}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
