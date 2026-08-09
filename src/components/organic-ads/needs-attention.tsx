"use client";

import { AlertTriangle, CircleAlert, Info } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import type { NeedsAttentionItem } from "@/types/organic-ads";

interface NeedsAttentionProps {
  items: NeedsAttentionItem[];
  onSelect: (item: NeedsAttentionItem) => void;
}

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

export function NeedsAttention({ items, onSelect }: NeedsAttentionProps) {
  const { t } = useTranslation();

  return (
    <section className="surface-panel flex h-full flex-col">
      <div className="panel-header">
        <h2 className="text-sm font-semibold tracking-tight">
          {t("organicAds.needsAttention.title")}
        </h2>
      </div>
      <div className="flex-1 p-2 sm:p-3">
        {items.length === 0 ? (
          <EmptyState
            compact
            title={t("organicAds.needsAttention.empty")}
            description={t("organicAds.needsAttention.emptyDesc")}
          />
        ) : (
          <ul className="grid gap-1">
            {items.map((item) => {
              const Icon = SEVERITY_ICON[item.severity] ?? Info;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(item)}
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
                        {item.title}
                      </span>
                      <span className="mt-0.5 block text-[12px] leading-relaxed text-muted-foreground">
                        {item.description}
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
  );
}
