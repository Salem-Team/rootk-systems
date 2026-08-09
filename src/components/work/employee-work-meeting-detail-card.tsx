"use client";

import type { Locale } from "date-fns";
import { format, parseISO } from "date-fns";
import { motion } from "framer-motion";
import { Pencil, Sparkles, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MetaChip } from "@/components/shared/meta-chip";
import { OriginBadge } from "@/components/work/employee-work-composer";
import { useTranslation } from "@/hooks/use-translation";
import { formatClockRange } from "@/lib/format-time";
import { snappySpring } from "@/lib/animations";
import { cn } from "@/lib/utils";
import type { WorkMeeting } from "@/types/work";

export function MeetingDetailCard({
  meeting,
  nameOf,
  dateLocale,
  embedded,
  onEdit,
  onDelete,
}: {
  meeting: WorkMeeting;
  nameOf: (id: string) => string;
  dateLocale: Locale;
  embedded?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const { t, locale } = useTranslation();

  return (
    <motion.article
      key={meeting.id}
      initial={embedded ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={snappySpring}
      className={cn(
        !embedded &&
          "rounded-2xl border border-border/70 bg-card p-5 shadow-[var(--shadow-card)] sm:p-6"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {t("workHub.meetingDetail")}
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-tight">
            {meeting.title}
          </h2>
          <div className="mt-2">
            <OriginBadge origin={meeting.origin} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {onEdit ? (
            <Button type="button" size="sm" variant="outline" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
              {t("common.edit")}
            </Button>
          ) : null}
          {onDelete ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <MetaChip
          label={t("workHub.when")}
          value={`${format(parseISO(meeting.date), "EEEE · d MMM", {
            locale: dateLocale,
          })} · ${formatClockRange(meeting.startTime, meeting.endTime, locale)}`}
        />
        <MetaChip label={t("workHub.location")} value={meeting.location} />
        <MetaChip
          label={t("workHub.organizer")}
          value={nameOf(meeting.organizerId)}
        />
        <MetaChip
          label={t("workHub.people")}
          value={String(meeting.participantIds.length)}
        />
      </div>

      <div className="mt-5 rounded-xl border border-primary/15 bg-primary/[0.04] px-4 py-3">
        <p className="flex items-center gap-2 text-[13px] font-semibold text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          {meeting.joinUrl ? t("workHub.joinOnline") : t("workHub.joinOnsite")}
        </p>
        <p className="mt-1 text-[12px] text-muted-foreground">
          {meeting.joinUrl || t("workHub.joinHintBody")}
        </p>
      </div>

      {meeting.agenda.length > 0 ? (
        <div className="mt-5">
          <h3 className="mb-2 text-[13px] font-semibold">{t("workHub.agenda")}</h3>
          <ol className="space-y-2">
            {meeting.agenda.map((item, i) => (
              <li
                key={`${meeting.id}-a-${i}`}
                className="flex gap-3 rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5 text-sm"
              >
                <span className="font-mono text-[11px] font-semibold text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <div className="mt-5">
        <h3 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold">
          <Users className="h-3.5 w-3.5" />
          {t("workHub.participants")}
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {meeting.participantIds.map((id) => (
            <Badge key={id} variant="secondary" className="h-7 rounded-full px-3">
              {nameOf(id)}
            </Badge>
          ))}
        </div>
      </div>

      {meeting.notes ? (
        <div className="mt-5">
          <h3 className="mb-2 text-[13px] font-semibold">{t("workHub.notes")}</h3>
          <p className="rounded-xl border border-border/60 bg-muted/20 px-3.5 py-3 text-[13px] leading-relaxed text-muted-foreground">
            {meeting.notes}
          </p>
        </div>
      ) : null}
    </motion.article>
  );
}
