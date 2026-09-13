"use client";

import { format } from "date-fns";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import { AttendanceSuccess } from "@/components/attendance/attendance-success";
import { CheckInActions } from "@/components/attendance/check-in-actions";
import { CheckInClock } from "@/components/attendance/check-in-clock";
import { CheckInStatusList } from "@/components/attendance/check-in-status-list";
import {
  formatTime,
  useCheckInPanel,
} from "@/components/attendance/use-check-in-panel";
import { formatHmDuration } from "@/lib/duration-format";
import { demoNow } from "@/lib/mock-date";
import { fadeInUp } from "@/lib/animations";
import { Button } from "@/components/ui/button";

export function CheckInPanel() {
  const {
    t,
    dateLocale,
    todayRecord,
    isCheckingIn,
    isCheckingOut,
    canCheckIn,
    canCheckOut,
    wfh,
    setWfh,
    wfhAllowed,
    burst,
    clearBurst,
    scheduleBreak,
    expectedOut,
    isLive,
    workMode,
    hoursDisplay,
    handleCheckIn,
    handleCheckOut,
  } = useCheckInPanel();

  const checkedIn = Boolean(todayRecord?.checkIn);
  const checkedOut = Boolean(todayRecord?.checkOut);
  const breakMinutes =
    todayRecord?.breakAppliedMinutes ?? (checkedOut ? scheduleBreak : 0);
  const breakDisplay =
    breakMinutes > 0 ? formatHmDuration(breakMinutes, t) : "—";

  const progress = (() => {
    if (!todayRecord?.checkIn || !expectedOut) return isLive ? 8 : 0;
    const start = new Date(todayRecord.checkIn).getTime();
    const end = new Date(expectedOut).getTime();
    const now = todayRecord.checkOut
      ? new Date(todayRecord.checkOut).getTime()
      : demoNow().getTime();
    if (end <= start) return isLive ? 10 : 0;
    return Math.max(0, Math.min(100, ((now - start) / (end - start)) * 100));
  })();

  return (
    <motion.div variants={fadeInUp} initial="hidden" animate="visible">
      <section
        id="employee-checkin"
        className="surface-panel relative scroll-mt-28 overflow-hidden"
        aria-labelledby="today-attendance-heading"
      >
        <AttendanceSuccess kind={burst} onDone={clearBurst} />

        <div className="panel-header">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3
                id="today-attendance-heading"
                className="text-base font-semibold tracking-tight"
              >
                {t("attendance.todayCardTitle")}
              </h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {format(demoNow(), "EEEE, MMMM d, yyyy", { locale: dateLocale })}
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-muted/30 px-2.5 py-1.5">
              <MapPin className="h-3.5 w-3.5 text-primary" aria-hidden />
              <span className="text-[12px] font-medium">
                {canCheckIn && wfh && wfhAllowed
                  ? t("attendance.workMode.remote")
                  : t(`attendance.workMode.${workMode}`)}
              </span>
              {canCheckIn && wfhAllowed ? (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto px-1 py-0 text-[12px]"
                  onClick={() => setWfh(!wfh)}
                >
                  {t("attendance.changeLocation")}
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="panel-body space-y-5">
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-stretch">
            <CheckInClock progress={progress} isLive={isLive} />
            <CheckInStatusList
              checkInTime={formatTime(todayRecord?.checkIn, dateLocale)}
              checkOutTime={formatTime(todayRecord?.checkOut, dateLocale)}
              hoursDisplay={hoursDisplay}
              breakDisplay={breakDisplay}
              isLive={isLive}
              checkedIn={checkedIn}
              checkedOut={checkedOut}
            />
          </div>

          <CheckInActions
            canCheckIn={canCheckIn}
            canCheckOut={canCheckOut}
            wfhAllowed={wfhAllowed}
            wfh={wfh}
            setWfh={setWfh}
            isCheckingIn={isCheckingIn}
            isCheckingOut={isCheckingOut}
            burst={burst}
            todayRecord={todayRecord}
            handleCheckIn={handleCheckIn}
            handleCheckOut={handleCheckOut}
          />
        </div>
      </section>
    </motion.div>
  );
}
