"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Locale } from "date-fns";
import { format, parseISO } from "date-fns";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CalendarDays, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListPagination } from "@/components/shared/list-pagination";
import { EmployeeAvatarStack } from "@/components/work/employee-multi-picker";
import { useListPagination } from "@/hooks/use-list-pagination";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { formatClockRange } from "@/lib/format-time";
import { meetingWhen } from "@/lib/work-utils";
import type { Employee } from "@/types";
import type { WorkMeeting } from "@/types/work";
import { BidiText } from "@/components/shared/bidi-text";

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
  const listRef = useRef<HTMLDivElement>(null);

  const fingerprint = useMemo(
    () => meetings.map((meeting) => meeting.id).join("|"),
    [meetings]
  );

  const { setPage, pageSize, setPageSize, slice } = useListPagination(
    meetings,
    { fingerprint }
  );

  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    listRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [slice.page, pageSize]);

  if (meetings.length === 0) {
    return (
      <ul className="space-y-2">
        <li className="rounded-2xl border border-dashed border-border/80 px-4 py-12 text-center sm:py-14">
          <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium text-foreground">
            {t("workAdmin.emptyMeetings")}
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
            {t("workAdmin.emptyMeetingsHint")}
          </p>
          <Button
            type="button"
            className="mt-4 h-11 w-full max-w-xs touch-manipulation rounded-xl sm:h-9 sm:w-auto sm:rounded-lg"
            size="sm"
            onClick={onCreateMeeting}
          >
            <Plus className="h-4 w-4" />
            {t("workAdmin.addMeeting")}
          </Button>
        </li>
      </ul>
    );
  }

  return (
    <div ref={listRef} className="space-y-3">
      <motion.ul
        variants={staggerContainer}
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
        className="space-y-2"
      >
        <AnimatePresence initial={false}>
          {slice.items.map((meeting) => {
            const when = meetingWhen(meeting.date);
            return (
              <motion.li
                key={meeting.id}
                layout={!reduceMotion}
                variants={fadeInUp}
                className="rounded-2xl border border-border/70 bg-card px-3.5 py-3.5 shadow-[var(--shadow-card)] transition-colors touch-manipulation hover:border-border sm:px-4"
              >
                <div className="flex flex-col gap-3.5">
                  <button
                    type="button"
                    className="min-w-0 w-full text-start touch-manipulation active:opacity-90"
                    onClick={() => onEdit(meeting)}
                  >
                    <p className="text-[15px] font-semibold leading-snug">
                      <BidiText text={meeting.title} />
                    </p>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
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
                    {meeting.location ? (
                      <p className="mt-1 text-[12px] text-muted-foreground">
                        {meeting.location}
                      </p>
                    ) : null}
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
                  </button>
                  <div className="flex gap-2 border-t border-border/50 pt-3 sm:justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-11 min-w-0 flex-1 touch-manipulation rounded-xl sm:h-9 sm:flex-none sm:rounded-lg"
                      onClick={() => onEdit(meeting)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      {t("common.edit")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-11 w-11 shrink-0 touch-manipulation rounded-xl text-destructive hover:text-destructive sm:h-9 sm:w-9 sm:rounded-lg"
                      onClick={() => onDeleteRequest(meeting)}
                      aria-label={t("common.delete")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </motion.ul>

      <ListPagination
        page={slice.page}
        totalPages={slice.totalPages}
        total={slice.total}
        from={slice.from}
        to={slice.to}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
