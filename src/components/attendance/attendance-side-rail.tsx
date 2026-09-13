"use client";

import { useEffect, useState } from "react";
import { ar as arLocale, enUS } from "date-fns/locale";
import { AttendanceTodaySummary } from "@/components/attendance/attendance-today-summary";
import { AttendanceWeekStrip } from "@/components/attendance/attendance-week-strip";
import { AttendanceTimeline } from "@/components/attendance/attendance-timeline";
import { useAttendanceStore } from "@/stores/attendance-store";
import { useTranslation } from "@/hooks/use-translation";
import { formatHmDuration } from "@/lib/duration-format";
import { elapsedSeconds, formatLiveDuration } from "@/lib/utils";
import type { AttendanceRecord } from "@/types";

export function AttendanceSideRail({
  history,
}: {
  history: AttendanceRecord[];
}) {
  const { t, locale } = useTranslation();
  const dateLocale = locale === "ar" ? arLocale : enUS;
  const todayRecord = useAttendanceStore((s) => s.todayRecord);
  const isLive = Boolean(todayRecord?.checkIn && !todayRecord?.checkOut);
  const [liveSeconds, setLiveSeconds] = useState(0);

  useEffect(() => {
    setLiveSeconds(
      elapsedSeconds(todayRecord?.checkIn, todayRecord?.checkOut)
    );
    if (!isLive) return;
    const id = window.setInterval(() => {
      setLiveSeconds(elapsedSeconds(todayRecord?.checkIn));
    }, 1000);
    return () => window.clearInterval(id);
  }, [todayRecord?.checkIn, todayRecord?.checkOut, isLive]);

  const hoursDisplay = todayRecord?.checkIn
    ? isLive
      ? formatLiveDuration(liveSeconds)
      : formatHmDuration(
          todayRecord.workingMinutes || Math.floor(liveSeconds / 60),
          t
        )
    : "—";

  return (
    <div className="flex h-full flex-col gap-4 sm:gap-5">
      <AttendanceTodaySummary
        todayRecord={todayRecord}
        hoursDisplay={hoursDisplay}
        scheduleBreak={60}
        dateLocale={dateLocale}
        isLive={isLive}
      />
      <AttendanceWeekStrip records={history} />
      <div className="min-h-0 flex-1">
        <AttendanceTimeline />
      </div>
    </div>
  );
}
