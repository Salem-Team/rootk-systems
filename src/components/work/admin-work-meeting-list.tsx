"use client";

import type { Locale } from "date-fns";
import { format, parseISO } from "date-fns";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CalendarDays, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmployeeAvatarStack } from "@/components/work/employee-multi-picker";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { formatClockRange } from "@/lib/format-time";
import { meetingWhen } from "@/lib/work-utils";
import type { Employee } from "@/types";
import type { WorkMeeting } from "@/types/work";

export function AdminWorkMeetingList({
  meetings,
  employeeMap,
  dateLocale,
  locale,
  onEdit,
  onDeleteRequest,
  onCreateMeeting,
}: {
  meetings: WorkMeeting[];
  employeeMap: Map<string, Employee>;
  dateLocale: Locale;
  locale: string;
  onEdit: (meeting: WorkMeeting) => void;
  onDeleteRequest: (meeting: WorkMeeting) => void;
  onCreateMeeting: () => void;
}) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

  return (
    <motion.ul
      variants={staggerContainer}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      className="space-y-2"
    >
      <AnimatePresence initial={false}>
        {meetings.map((meeting) => {
          const when = meetingWhen(meeting.date);
          return (
            <motion.li
              key={meeting.id}
              layout={!reduceMotion}
              variants={fadeInUp}
              className="rounded-2xl border border-border/70 bg-card px-4 py-3.5 shadow-[var(--shadow-card)] transition-colors hover:border-border"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold leading-snug">
                    {meeting.title}
                  </p>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    {format(parseISO(meeting.date), "EEEE · d MMM", {
                      locale: dateLocale,
                    })}{" "}
                    ·{" "}
                    {formatClockRange(
                      meeting.startTime,
                      meeting.endTime,
                      locale
                    )}
                  </p>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    {meeting.location}
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        when === "today"
                          ? "info"
                          : when === "past"
                            ? "outline"
                            : "secondary"
                      }
                    >
                      {t(`workAdmin.when.${when}`)}
                    </Badge>
                    <EmployeeAvatarStack
                      employees={employeeMap}
                      ids={meeting.participantIds}
                    />
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onEdit(meeting)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {t("common.edit")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => onDeleteRequest(meeting)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </motion.li>
          );
        })}
      </AnimatePresence>
      {meetings.length === 0 ? (
        <li className="rounded-2xl border border-dashed border-border/80 px-4 py-14 text-center">
          <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium text-foreground">
            {t("workAdmin.emptyMeetings")}
          </p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {t("workAdmin.emptyMeetingsHint")}
          </p>
          <Button
            type="button"
            className="mt-4"
            size="sm"
            onClick={onCreateMeeting}
          >
            <Plus className="h-4 w-4" />
            {t("workAdmin.addMeeting")}
          </Button>
        </li>
      ) : null}
    </motion.ul>
  );
}
