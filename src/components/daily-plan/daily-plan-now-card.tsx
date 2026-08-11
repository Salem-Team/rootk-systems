"use client";

import { Radio } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import { formatClockHm, formatClockRange } from "@/lib/format-time";
import type { DailyPlanNow } from "@/lib/daily-plan";
import { cn } from "@/lib/utils";

export function DailyPlanNowCard({
  snapshot,
  now,
  locale,
}: {
  snapshot: DailyPlanNow;
  now: Date;
  locale: string;
}) {
  const { t } = useTranslation();
  const clock = formatClockHm(
    `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
    locale
  );

  const headline =
    snapshot.phase === "current" && snapshot.current
      ? snapshot.current.title
      : snapshot.phase === "before" && snapshot.next
        ? t("dailyPlan.startsSoon")
        : snapshot.phase === "between" && snapshot.next
          ? t("dailyPlan.betweenBlocks")
          : snapshot.phase === "after"
            ? t("dailyPlan.dayWrapped")
            : t("dailyPlan.emptyNow");

  const detail =
    snapshot.phase === "current" && snapshot.current
      ? formatClockRange(snapshot.current.startTime, snapshot.current.endTime, locale)
      : snapshot.next
        ? `${t("dailyPlan.next")}: ${snapshot.next.title} · ${formatClockRange(
            snapshot.next.startTime,
            snapshot.next.endTime,
            locale
          )}`
        : snapshot.previous
          ? `${t("dailyPlan.last")}: ${snapshot.previous.title}`
          : t("dailyPlan.emptyNowDesc");

  return (
    <section className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-3.5 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          <Radio className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {t("dailyPlan.now")}
        </p>
        <p className="shrink-0 rounded-full border border-primary/15 bg-card/80 px-2.5 py-1 font-mono text-[12px] tabular-nums text-foreground/80 shadow-sm">
          {clock}
        </p>
      </div>
      <h2 className="mt-2.5 text-[1.35rem] font-semibold leading-tight tracking-tight sm:mt-1.5 sm:text-2xl">
        {headline}
      </h2>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
        {detail}
      </p>
      {snapshot.phase === "current" ? (
        <div className="mt-3.5 h-1.5 overflow-hidden rounded-full bg-primary/15 sm:mt-4">
          <div
            className={cn("h-full rounded-full bg-primary transition-[width]")}
            style={{ width: `${Math.max(6, Math.round(snapshot.progress * 100))}%` }}
          />
        </div>
      ) : null}
    </section>
  );
}
