"use client";

import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import type { WeeklyActivityPoint } from "@/types/organic-ads";

export function WeeklyActivity({ points }: { points: WeeklyActivityPoint[] }) {
  const { t } = useTranslation();
  const max = Math.max(...points.map((p) => p.count), 1);
  const total = points.reduce((s, p) => s + p.count, 0);

  return (
    <section className="surface-panel">
      <div className="panel-header">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">
            {t("organicAds.weekly.title")}
          </h2>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {t("organicAds.weekly.subtitle")}
          </p>
        </div>
      </div>
      <div className="p-4">
        {total === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t("organicAds.weekly.empty")}
          </p>
        ) : (
          <ul className="grid grid-cols-7 gap-2" aria-label={t("organicAds.weekly.title")}>
            {points.map((point) => {
              const height = Math.max(8, Math.round((point.count / max) * 72));
              return (
                <li key={point.date} className="flex flex-col items-center gap-1.5">
                  <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                    {point.count}
                  </span>
                  <div className="flex h-[72px] w-full items-end justify-center">
                    <div
                      className={cn(
                        "w-full max-w-[28px] rounded-md bg-primary/75",
                        point.count === 0 && "bg-muted"
                      )}
                      style={{ height }}
                      title={`${point.label}: ${point.count}`}
                    />
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {point.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
