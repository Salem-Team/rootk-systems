"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Clock3, MapPin, Users } from "lucide-react";
import { OpsWidget } from "@/components/operations/ops-widget";
import { getMyWorkMeetings } from "@/services/work.service";
import { getWorkEmployeeIdFromUser, useSessionStore } from "@/stores/session-store";
import { useTranslation } from "@/hooks/use-translation";
import { WORK_UPDATED_EVENT } from "@/lib/events";
import { formatClockRange } from "@/lib/format-time";
import { meetingWhen } from "@/lib/work-utils";
import { fadeInUp, snappySpring, staggerContainer } from "@/lib/animations";
import type { WorkMeeting } from "@/types/work";

export function MeetingsWidget() {
  const { t } = useTranslation();
  const workEmployeeId = useSessionStore((s) =>
    getWorkEmployeeIdFromUser(s.user)
  );
  const [meetings, setMeetings] = useState<WorkMeeting[]>([]);

  useEffect(() => {
    void (async () => {
      const res = await getMyWorkMeetings(workEmployeeId);
      if (res.success) setMeetings(res.data);
    })();
  }, [workEmployeeId]);

  useEffect(() => {
    const onUpdate = () => {
      void (async () => {
        const res = await getMyWorkMeetings(workEmployeeId);
        if (res.success) setMeetings(res.data);
      })();
    };
    window.addEventListener(WORK_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(WORK_UPDATED_EVENT, onUpdate);
  }, [workEmployeeId]);

  const today = meetings.filter((m) => meetingWhen(m.date) === "today");
  const upcoming = meetings.filter((m) => meetingWhen(m.date) === "upcoming");

  return (
    <OpsWidget
      id="meetings"
      title={t("ops.meetingsTitle")}
      description={t("ops.meetingsDesc")}
    >
      <div className="space-y-4">
        <MeetingGroup title={t("ops.meetingsToday")} items={today} />
        <MeetingGroup title={t("ops.meetingsUpcoming")} items={upcoming} />
      </div>
    </OpsWidget>
  );
}

function MeetingGroup({
  title,
  items,
}: {
  title: string;
  items: WorkMeeting[];
}) {
  const { t, locale } = useTranslation();
  const reduceMotion = useReducedMotion();

  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <motion.ul
        variants={staggerContainer}
        initial={false}
        animate="visible"
        className="space-y-2"
      >
        {items.map((m) => (
          <motion.li
            key={m.id}
            variants={fadeInUp}
            whileHover={
              reduceMotion ? undefined : { y: -1, transition: snappySpring }
            }
            className="list-row px-3 py-2.5"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-sm font-semibold">{m.title}</p>
              <span className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                <Clock3 className="h-3 w-3" aria-hidden />
                {formatClockRange(m.startTime, m.endTime, locale)}
              </span>
            </div>
            <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" aria-hidden />
              {m.location}
            </p>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" aria-hidden />
              {m.participantIds.length} {t("workHub.people")}
            </p>
          </motion.li>
        ))}
        {items.length === 0 ? (
          <li className="px-1 py-3 text-xs text-muted-foreground">
            {t("workHub.noMeetings")}
          </li>
        ) : null}
      </motion.ul>
    </div>
  );
}
