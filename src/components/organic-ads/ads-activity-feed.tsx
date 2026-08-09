"use client";

import { formatDistanceToNow } from "date-fns";
import { EmptyState } from "@/components/shared/empty-state";
import { useTranslation } from "@/hooks/use-translation";
import type { OrganicAdHistoryEvent } from "@/types/organic-ads";

export function AdsActivityFeed({
  events,
}: {
  events: OrganicAdHistoryEvent[];
}) {
  const { t } = useTranslation();

  return (
    <section className="surface-panel">
      <div className="panel-header">
        <h2 className="text-sm font-semibold tracking-tight">
          {t("organicAds.activityFeed.title")}
        </h2>
      </div>
      <div className="p-3 sm:p-4">
        {events.length === 0 ? (
          <EmptyState compact title={t("organicAds.activityFeed.empty")} />
        ) : (
          <ul className="grid gap-3">
            {events.slice(0, 12).map((event) => (
              <li
                key={event.id}
                className="flex items-start justify-between gap-3 border-b border-border/50 pb-3 last:border-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-medium leading-snug">
                    <span className="text-foreground">{event.actorName}</span>{" "}
                    <span className="font-normal text-muted-foreground">
                      {event.note}
                    </span>
                  </p>
                </div>
                <time
                  className="shrink-0 text-[11px] text-muted-foreground"
                  dateTime={event.createdAt}
                >
                  {formatDistanceToNow(new Date(event.createdAt), {
                    addSuffix: true,
                  })}
                </time>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
