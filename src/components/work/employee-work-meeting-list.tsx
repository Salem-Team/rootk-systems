"use client";

import type { Locale } from "date-fns";
import { format, parseISO } from "date-fns";
import { motion } from "framer-motion";
import { Clock3, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OriginBadge } from "@/components/work/employee-work-composer";
import { useTranslation } from "@/hooks/use-translation";
import { formatClockRange } from "@/lib/format-time";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { cn } from "@/lib/utils";
import type { WorkMeeting } from "@/types/work";

export function MeetingList({
  title,
  items,
  activeId,
  onSelect,
  dateLocale,
  onCreate,
}: {
  title: string;
  items: WorkMeeting[];
  activeId?: string;
  onSelect: (id: string) => void;
  dateLocale: Locale;
  onCreate?: () => void;
}) {
  const { t, locale } = useTranslation();

  return (
    <section>
      <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title} · {items.length}
      </p>
      <motion.ul
        variants={staggerContainer}
        initial={false}
        animate="visible"
        className="space-y-2"
      >
        {items.map((m) => {
          const active = activeId === m.id;
          return (
            <motion.li key={m.id} variants={fadeInUp}>
              <button
                type="button"
                onClick={() => onSelect(m.id)}
                className={cn(
                  "list-row w-full px-3.5 py-3 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                  active && "list-row-active"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[14px] font-semibold leading-snug">
                    {m.title}
                  </p>
                  <span className="inline-flex shrink-0 items-center gap-1 font-mono text-[11px] text-muted-foreground">
                    <Clock3 className="h-3 w-3" />
                    {formatClockRange(m.startTime, m.endTime, locale)}
                  </span>
                </div>
                <div className="mt-1.5">
                  <OriginBadge origin={m.origin} />
                </div>
                <p className="mt-1.5 flex items-center gap-1 text-[12px] text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {m.location}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {format(parseISO(m.date), "d MMM", { locale: dateLocale })} ·{" "}
                  {m.participantIds.length} {t("workHub.people")}
                </p>
              </button>
            </motion.li>
          );
        })}
        {items.length === 0 ? (
          <li className="rounded-2xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            <p>{t("workHub.noMeetings")}</p>
            {onCreate ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={onCreate}
              >
                {t("workHub.addPersonalMeeting")}
              </Button>
            ) : null}
          </li>
        ) : null}
      </motion.ul>
    </section>
  );
}
