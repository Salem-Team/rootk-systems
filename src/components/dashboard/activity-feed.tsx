"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { BidiText } from "@/components/shared/bidi-text";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SoftListRow } from "@/components/shared/meta-chip";
import { groupActivitiesByDay } from "@/components/dashboard/dashboard-mock-data";
import { useTranslation } from "@/hooks/use-translation";
import type { TranslationPath } from "@/i18n";
import { resolveActivityVisual } from "@/lib/activity-ui";
import { localizedActivity } from "@/lib/i18n-content";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { cn } from "@/lib/utils";
import type { Activity } from "@/types";

function dayLabel(
  dayKey: string,
  t: (k: TranslationPath) => string,
  locale: typeof enUS
) {
  const d = parseISO(dayKey);
  if (isToday(d)) return t("dashboard.today");
  if (isYesterday(d)) return t("dashboard.yesterday");
  return format(d, "EEEE, MMM d", { locale });
}

export function ActivityFeed({
  activities,
  title,
  description,
  viewAllHref,
}: {
  activities: Activity[];
  title?: string;
  description?: string;
  viewAllHref?: string;
}) {
  const { t, locale } = useTranslation();
  const reduceMotion = useReducedMotion();
  const dateLocale = locale === "ar" ? arLocale : enUS;
  const groups = groupActivitiesByDay(activities ?? []);
  const isEmpty = groups.length === 0;

  return (
    <section
      className="surface-panel flex h-full flex-col overflow-hidden"
      aria-labelledby="activity-feed-heading"
    >
      <div className="panel-header flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3
            id="activity-feed-heading"
            className="text-[0.95rem] font-semibold tracking-tight"
          >
            {title ?? t("dashboard.activities")}
          </h3>
          <p className="mt-0.5 hidden text-sm text-muted-foreground sm:block">
            {description ?? t("dashboard.activitiesDesc")}
          </p>
        </div>
        {viewAllHref ? (
          <Button asChild variant="ghost" size="sm" className="shrink-0 gap-1">
            <Link href={viewAllHref}>
              {t("dashboard.viewAll")}
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </Button>
        ) : null}
      </div>

      {isEmpty ? (
        <div className="panel-body">
          <EmptyState
            compact
            title={t("dashboard.activitiesEmpty")}
            description={t("dashboard.activitiesEmptyDesc")}
          />
        </div>
      ) : (
        <div className="p-2 sm:p-3">
          <ScrollArea className="h-[min(340px,55vh)] pe-2 sm:h-[340px]">
            <motion.div
              variants={reduceMotion ? undefined : staggerContainer}
              initial={reduceMotion ? false : "hidden"}
              animate={reduceMotion ? undefined : "visible"}
              className="space-y-4"
            >
              {groups.map((group) => (
                <div key={group.dayKey}>
                  <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {dayLabel(group.dayKey, t, dateLocale)}
                  </p>
                  <ul className="space-y-1">
                    {group.items.map((activity) => {
                      const { icon: Icon, tone } = resolveActivityVisual(
                        activity.type
                      );
                      const copy = localizedActivity(activity, t);
                      const row = (
                        <SoftListRow className="flex items-center gap-3 !py-2.5">
                          <div
                            className={cn(
                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                              tone
                            )}
                          >
                            <Icon className="h-3.5 w-3.5" aria-hidden />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-medium">
                              {copy.title}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              <BidiText text={copy.description} />
                            </p>
                          </div>
                          <time
                            className="shrink-0 text-[11px] tabular-nums text-muted-foreground"
                            dateTime={activity.timestamp}
                          >
                            {formatDistanceToNow(new Date(activity.timestamp), {
                              addSuffix: true,
                              locale: dateLocale,
                            })}
                          </time>
                        </SoftListRow>
                      );
                      return reduceMotion ? (
                        <li key={activity.id}>{row}</li>
                      ) : (
                        <motion.li key={activity.id} variants={fadeInUp}>
                          {row}
                        </motion.li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </motion.div>
          </ScrollArea>
        </div>
      )}
    </section>
  );
}
