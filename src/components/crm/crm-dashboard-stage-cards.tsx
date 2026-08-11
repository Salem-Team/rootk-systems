"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import type { CrmLeadFilters, CrmStageCard } from "@/types/crm";

interface CrmDashboardStageCardsProps {
  stageCards: CrmStageCard[];
  onNavigateLeads: (filters?: Partial<CrmLeadFilters>) => void;
}

/** Horizontally scrolling stage pipeline cards with trend indicators. */
export function CrmDashboardStageCards({
  stageCards,
  onNavigateLeads,
}: CrmDashboardStageCardsProps) {
  const { t } = useTranslation();

  return (
    <section className="surface-panel overflow-hidden">
      <div className="panel-header">
        <h3 className="text-[0.95rem] font-semibold tracking-tight">
          {t("crm.dashboard.stageCards")}
        </h3>
      </div>
      <div className="scroll-x flex gap-3 px-3 pb-3 pt-1 [scrollbar-width:thin]">
        {stageCards.length === 0 ? (
          <p className="px-1 py-4 text-sm text-muted-foreground">
            {t("crm.empty.chart")}
          </p>
        ) : (
          stageCards.map((card) => {
            const trend = Number(card.trendPercent ?? 0);
            const up = trend >= 0;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => onNavigateLeads({ stageId: card.id })}
                className="min-w-[160px] shrink-0 rounded-xl border border-border/70 bg-background px-3.5 py-3 text-start transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: card.color || "#082868" }}
                    aria-hidden
                  />
                  <span className="truncate text-[13px] font-semibold">
                    {card.name}
                  </span>
                </div>
                <p className="mt-2 font-mono text-xl font-semibold tabular-nums">
                  {card.count}
                </p>
                <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                  <span>
                    {Number(card.percent ?? 0).toFixed(0)}
                    {t("crm.dashboard.ofPipeline")}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5 font-medium",
                      up
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-rose-700 dark:text-rose-400"
                    )}
                  >
                    {up ? (
                      <ArrowUpRight className="h-3 w-3" aria-hidden />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" aria-hidden />
                    )}
                    {Math.abs(trend).toFixed(0)}%
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
