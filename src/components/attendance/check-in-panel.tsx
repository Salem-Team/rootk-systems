"use client";

import { format } from "date-fns";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Clock, MapPin } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { AttendanceDurationBadge } from "@/components/shared/late-duration-badge";
import { AttendanceSuccess } from "@/components/attendance/attendance-success";
import { SessionCard } from "@/components/attendance/session-card";
import { CheckInActions } from "@/components/attendance/check-in-actions";
import { CheckInMetrics } from "@/components/attendance/check-in-metrics";
import { useCheckInPanel } from "@/components/attendance/use-check-in-panel";
import { demoNow } from "@/lib/mock-date";
import { easeOutExpo, fadeInUp } from "@/lib/animations";
import { formatHmDuration } from "@/lib/duration-format";

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
    statusDisplay,
    metricItems,
    handleCheckIn,
    handleCheckOut,
  } = useCheckInPanel();
  const reduceMotion = useReducedMotion();

  return (
    <motion.div variants={fadeInUp} initial="hidden" animate="visible">
      <section
        id="employee-checkin"
        className="surface-panel relative scroll-mt-28 overflow-hidden"
        aria-labelledby="today-attendance-heading"
      >
        <AttendanceSuccess kind={burst} onDone={clearBurst} />

        <div className="panel-header">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="icon-well">
                <Clock className="h-3.5 w-3.5" aria-hidden />
              </span>
              <div>
                <h3
                  id="today-attendance-heading"
                  className="text-base font-semibold tracking-tight"
                >
                  {t("attendance.todayStatus")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {format(demoNow(), "EEEE, MMM d", { locale: dateLocale })}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={statusDisplay} />
              <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                <MapPin className="h-3 w-3" aria-hidden />
                {t(`attendance.workMode.${workMode}`)}
              </span>
            </div>
          </div>
        </div>

        <div className="panel-body space-y-4 sm:space-y-5">
          <CheckInMetrics
            metricItems={metricItems}
            isLive={isLive}
            hoursDisplay={hoursDisplay}
            todayRecord={todayRecord}
            workMode={workMode}
            statusDisplay={statusDisplay}
            dateLocale={dateLocale}
          />

          <AnimatePresence mode="wait">
            {todayRecord?.checkIn ? (
              <motion.div
                key={`${todayRecord.checkIn}-${todayRecord.checkOut ?? "live"}`}
                initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.35, ease: easeOutExpo }}
                className="hidden sm:block"
              >
                <SessionCard
                  checkIn={todayRecord.checkIn}
                  checkOut={todayRecord.checkOut}
                  status={todayRecord.status}
                  breakMinutes={
                    todayRecord.breakAppliedMinutes ?? scheduleBreak
                  }
                  workingMinutes={todayRecord.workingMinutes}
                  expectedOutIso={expectedOut}
                  scheduledMinutes={
                    Math.max(
                      0,
                      // 9h default span fallback — SessionCard uses expectedOutIso for progress
                      9 * 60
                    )
                  }
                />
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="flex flex-wrap items-center gap-2">
            {todayRecord?.isLate ? (
              <AttendanceDurationBadge minutes={todayRecord.lateMinutes} />
            ) : null}
            {todayRecord?.isEarlyLeave ? (
              <AttendanceDurationBadge
                kind="early"
                minutes={Math.max(todayRecord.earlyLeaveMinutes ?? 0, 1)}
              />
            ) : null}
            {(todayRecord?.overtimeMinutes ?? 0) > 0 ? (
              <AttendanceDurationBadge
                kind="overtime"
                minutes={todayRecord?.overtimeMinutes ?? 0}
              />
            ) : null}
            {todayRecord?.checkOut &&
            (todayRecord.breakAppliedMinutes ?? 0) > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">
                <span className="font-medium">{t("attendance.breakDeducted")}</span>
                <span className="font-semibold tabular-nums text-foreground">
                  {formatHmDuration(todayRecord.breakAppliedMinutes ?? 0, t)}
                </span>
              </span>
            ) : null}
            {!todayRecord?.checkIn ? (
              <span className="text-sm text-muted-foreground">
                {t("attendance.notCheckedIn")}
              </span>
            ) : null}
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
