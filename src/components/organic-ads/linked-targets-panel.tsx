"use client";

import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import type { LinkedTargetProgress } from "@/types/organic-ads";

export function LinkedTargetsPanel({
  targets,
}: {
  targets: LinkedTargetProgress[];
}) {
  const { t } = useTranslation();

  return (
    <section className="surface-panel">
      <div className="panel-header flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">
            {t("organicAds.linkedTargets.title")}
          </h2>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {t("organicAds.linkedTargets.subtitle")}
          </p>
        </div>
        <Link
          href="/targets"
          className="text-[12px] font-medium text-primary hover:underline"
        >
          {t("organicAds.linkedTargets.openTargets")}
        </Link>
      </div>
      <div className="p-3 sm:p-4">
        {targets.length === 0 ? (
          <EmptyState
            compact
            title={t("organicAds.linkedTargets.empty")}
            description={t("organicAds.linkedTargets.emptyDesc")}
          />
        ) : (
          <ul className="grid gap-2">
            {targets.map((target) => {
              const pct =
                target.quantity > 0
                  ? Math.min(
                      100,
                      Math.round(
                        (target.completedQuantity / target.quantity) * 100
                      )
                    )
                  : 0;
              return (
                <li
                  key={target.id}
                  className="rounded-lg border border-border/65 px-3 py-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold">
                        {target.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {t("organicAds.linkedTargets.progress")}:{" "}
                        {target.completedQuantity}/{target.quantity} ·{" "}
                        {t("organicAds.linkedTargets.remaining")}:{" "}
                        {target.remaining}
                      </p>
                    </div>
                    <span className="font-mono text-[12px] tabular-nums text-muted-foreground">
                      {pct}%
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        pct >= 100
                          ? "bg-emerald-600"
                          : pct >= 50
                            ? "bg-primary/80"
                            : "bg-amber-500"
                      )}
                      style={{ width: `${Math.max(pct, pct > 0 ? 6 : 0)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
