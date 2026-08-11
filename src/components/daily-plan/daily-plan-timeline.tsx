"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";
import { formatClockRange } from "@/lib/format-time";
import type { DailyPlanNow } from "@/lib/daily-plan";
import { sortDailyPlanSlots } from "@/lib/daily-plan";
import { cn } from "@/lib/utils";
import type { DailyPlanSlot } from "@/types/daily-plan";

export function DailyPlanTimeline({
  slots,
  snapshot,
  locale,
  canEdit,
  onEdit,
  onDelete,
}: {
  slots: DailyPlanSlot[];
  snapshot: DailyPlanNow;
  locale: string;
  canEdit: boolean;
  onEdit: (slot: DailyPlanSlot) => void;
  onDelete: (slot: DailyPlanSlot) => void;
}) {
  const { t } = useTranslation();
  const ordered = sortDailyPlanSlots(slots);

  if (ordered.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/80 px-4 py-10 text-center sm:py-12">
        <p className="text-sm font-medium">{t("dailyPlan.emptyTitle")}</p>
        <p className="mx-auto mt-1 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
          {canEdit ? t("dailyPlan.emptyAdmin") : t("dailyPlan.emptyEmployee")}
        </p>
      </div>
    );
  }

  return (
    <ol className="relative space-y-2.5 border-s-2 border-border/70 ms-2 ps-4 sm:ms-3 sm:space-y-2 sm:ps-5">
      {ordered.map((slot) => {
        const isCurrent = snapshot.current?.id === slot.id;
        const isNext = !isCurrent && snapshot.next?.id === slot.id;
        return (
          <li key={slot.id} className="relative">
            <span
              className={cn(
                "absolute top-4 -start-[1.35rem] h-2.5 w-2.5 rounded-full border-2 bg-card sm:-start-[1.6rem]",
                isCurrent
                  ? "border-primary bg-primary ring-4 ring-primary/20"
                  : isNext
                    ? "border-primary/50 bg-primary/30"
                    : "border-border bg-muted"
              )}
              aria-hidden
            />
            <div
              className={cn(
                "rounded-xl border px-3 py-3 sm:px-4",
                isCurrent
                  ? "border-primary/40 bg-primary/8 ring-1 ring-primary/20"
                  : "border-border/70 bg-card"
              )}
            >
              <div className="flex items-start justify-between gap-2 sm:gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <p className="font-mono text-[12px] tabular-nums text-muted-foreground">
                      {formatClockRange(slot.startTime, slot.endTime, locale)}
                    </p>
                    {isCurrent ? (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
                        {t("dailyPlan.live")}
                      </span>
                    ) : null}
                    {isNext ? (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("dailyPlan.upNext")}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[15px] font-semibold leading-snug tracking-tight">
                    {slot.title}
                  </p>
                  {slot.description ? (
                    <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
                      {slot.description}
                    </p>
                  ) : null}
                </div>
                {canEdit ? (
                  <div className="hidden shrink-0 gap-1 sm:flex">
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => onEdit(slot)}
                      aria-label={t("common.edit")}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => onDelete(slot)}
                      aria-label={t("common.delete")}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : null}
              </div>
              {canEdit ? (
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/60 pt-2.5 sm:hidden">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10"
                    onClick={() => onEdit(slot)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {t("common.edit")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 text-destructive hover:text-destructive"
                    onClick={() => onDelete(slot)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t("common.delete")}
                  </Button>
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
