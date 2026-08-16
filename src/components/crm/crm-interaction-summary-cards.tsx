"use client";

import { useTranslation } from "@/hooks/use-translation";
import type { TranslationPath } from "@/i18n";
import { cn } from "@/lib/utils";
import type { CrmInteractionSummaryKind } from "@/lib/crm/interaction-analytics";
import type { CrmCallMeetingBucket } from "@/types/crm";

export const INTERACTION_SUMMARY_LABEL_PATH = {
  activeCalls: "crm.performance.colActiveCalls",
  inactiveCalls: "crm.performance.colInactiveCalls",
  meetings: "crm.interactions.meetings",
  meetingsSplit: "crm.interactions.meetingsSplit",
} as const satisfies Record<CrmInteractionSummaryKind, TranslationPath>;

interface CrmInteractionSummaryCardsProps {
  totals: CrmCallMeetingBucket;
  onSelect: (kind: CrmInteractionSummaryKind) => void;
}

/** Clickable KPI tiles for the calls & meetings summary. */
export function CrmInteractionSummaryCards({
  totals,
  onSelect,
}: CrmInteractionSummaryCardsProps) {
  const { t } = useTranslation();

  const items: Array<{
    kind: CrmInteractionSummaryKind;
    label: string;
    value: string | number;
    className?: string;
  }> = [
    {
      kind: "activeCalls",
      label: t(INTERACTION_SUMMARY_LABEL_PATH.activeCalls),
      value: totals.activeCalls,
      className: "text-emerald-700 dark:text-emerald-400",
    },
    {
      kind: "inactiveCalls",
      label: t(INTERACTION_SUMMARY_LABEL_PATH.inactiveCalls),
      value: totals.inactiveCalls,
      className: "text-rose-700 dark:text-rose-400",
    },
    {
      kind: "meetings",
      label: t(INTERACTION_SUMMARY_LABEL_PATH.meetings),
      value: totals.meetings,
    },
    {
      kind: "meetingsSplit",
      label: t(INTERACTION_SUMMARY_LABEL_PATH.meetingsSplit),
      value: `${totals.meetingsOnline}/${totals.meetingsOffline}`,
    },
  ];

  return (
    <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <button
          key={item.kind}
          type="button"
          onClick={() => onSelect(item.kind)}
          className="cursor-pointer rounded-lg border border-border/70 px-3 py-2.5 text-start transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t("crm.interactions.summaryCardAria", {
            label: item.label,
          })}
        >
          <p className="text-[11px] text-muted-foreground">{item.label}</p>
          <p
            className={cn(
              "mt-1 font-mono text-lg font-semibold tabular-nums",
              item.className
            )}
          >
            {item.value}
          </p>
        </button>
      ))}
    </div>
  );
}
