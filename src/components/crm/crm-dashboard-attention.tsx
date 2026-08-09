"use client";

import { AlertTriangle, CircleAlert, Info, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import type { CrmAttentionItem, CrmInsight } from "@/types/crm";

const SEVERITY_ICON = {
  critical: CircleAlert,
  warning: AlertTriangle,
  info: Info,
} as const;

const SEVERITY_TONE = {
  critical: "text-rose-700 dark:text-rose-400",
  warning: "text-amber-700 dark:text-amber-400",
  info: "text-sky-700 dark:text-sky-400",
} as const;

interface CrmDashboardAttentionProps {
  needsAttention: CrmAttentionItem[];
  insights: CrmInsight[];
  onAttention: (item: CrmAttentionItem) => void;
}

/** "Needs attention" list and AI-style insights list, side by side. */
export function CrmDashboardAttention({
  needsAttention,
  insights,
  onAttention,
}: CrmDashboardAttentionProps) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="surface-panel flex h-full flex-col">
        <div className="panel-header">
          <h3 className="text-sm font-semibold tracking-tight">
            {t("crm.dashboard.needsAttention")}
          </h3>
        </div>
        <div className="flex-1 p-2 sm:p-3">
          {needsAttention.length === 0 ? (
            <EmptyState
              compact
              title={t("crm.empty.attention")}
              description={t("crm.empty.attentionDesc")}
            />
          ) : (
            <ul className="grid gap-1">
              {needsAttention.map((item) => {
                const Icon = SEVERITY_ICON[item.severity] ?? Info;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onAttention(item)}
                      className="flex w-full items-start gap-3 rounded-lg px-2.5 py-2.5 text-start transition-colors hover:bg-muted/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border/70 bg-background",
                          SEVERITY_TONE[item.severity] ?? SEVERITY_TONE.info
                        )}
                        aria-hidden
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13px] font-semibold">
                          {item.title || t(`crm.attention.${item.kind}`)}
                        </span>
                        <span className="mt-0.5 block font-mono text-[12px] tabular-nums text-muted-foreground">
                          {item.count}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section className="surface-panel flex h-full flex-col">
        <div className="panel-header">
          <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
            {t("crm.dashboard.insights")}
          </h3>
        </div>
        <div className="flex-1 p-2 sm:p-3">
          {insights.length === 0 ? (
            <EmptyState compact title={t("crm.empty.insights")} />
          ) : (
            <ul className="grid gap-2">
              {insights.map((insight) => (
                <li
                  key={insight.id}
                  className="rounded-lg border border-border/60 px-3 py-2.5 text-[13px] leading-relaxed text-muted-foreground"
                >
                  {insight.text}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
