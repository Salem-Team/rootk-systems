"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Clock,
  Home,
  LogIn,
  LogOut,
  Loader2,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/shared/status-badge";
import { MetaChip } from "@/components/shared/meta-chip";
import { AttendanceDurationBadge } from "@/components/shared/late-duration-badge";
import {
  AttendanceSuccess,
  type AttendanceBurstKind,
} from "@/components/attendance/attendance-success";
import { SessionCard } from "@/components/attendance/session-card";
import {
  expectedCheckOutIso,
  resolveWorkMode,
} from "@/components/attendance/attendance-mock-data";
import {
  selectCanCheckIn,
  selectCanCheckOut,
  useAttendanceStore,
} from "@/stores/attendance-store";
import {
  getWorkEmployeeIdFromUser,
  useSessionStore,
} from "@/stores/session-store";
import { demoNow, demoTodayKey } from "@/lib/mock-date";
import { getWfhEligibility, getWorkSchedule } from "@/services/schedule.service";
import { useTranslation } from "@/hooks/use-translation";
import {
  easeOutExpo,
  fadeInUp,
  snappySpring,
  softSpring,
  staggerFast,
} from "@/lib/animations";
import { formatHmDuration } from "@/lib/duration-format";
import {
  cn,
  elapsedSeconds,
  formatLiveDuration,
} from "@/lib/utils";

function formatTime(iso: string | undefined, dateLocale: Locale): string {
  if (!iso) return "—";
  return format(parseISO(iso), "h:mm a", { locale: dateLocale });
}

type Locale = typeof enUS;

export function CheckInPanel() {
  const { t, locale } = useTranslation();
  const reduceMotion = useReducedMotion();
  const dateLocale = locale === "ar" ? arLocale : enUS;
  const todayRecord = useAttendanceStore((s) => s.todayRecord);
  const isCheckingIn = useAttendanceStore((s) => s.isCheckingIn);
  const isCheckingOut = useAttendanceStore((s) => s.isCheckingOut);
  const error = useAttendanceStore((s) => s.error);
  const clearError = useAttendanceStore((s) => s.clearError);
  const fetchTodayRecord = useAttendanceStore((s) => s.fetchTodayRecord);
  const checkIn = useAttendanceStore((s) => s.checkIn);
  const checkOut = useAttendanceStore((s) => s.checkOut);
  const canCheckIn = useAttendanceStore(selectCanCheckIn);
  const canCheckOut = useAttendanceStore(selectCanCheckOut);

  const workEmployeeId = useSessionStore((s) =>
    getWorkEmployeeIdFromUser(s.user)
  );
  const [wfh, setWfh] = useState(false);
  const [wfhAllowed, setWfhAllowed] = useState(false);
  const [burst, setBurst] = useState<AttendanceBurstKind>(null);
  const [liveSeconds, setLiveSeconds] = useState(0);
  const [scheduleToTime, setScheduleToTime] = useState("18:00");
  const [scheduleBreak, setScheduleBreak] = useState(60);

  const isLive = Boolean(todayRecord?.checkIn && !todayRecord?.checkOut);
  const workMode = resolveWorkMode(todayRecord);
  const expectedOut = useMemo(
    () =>
      expectedCheckOutIso(
        todayRecord?.date ?? demoTodayKey(),
        scheduleToTime
      ),
    [todayRecord?.date, scheduleToTime]
  );

  useEffect(() => {
    void fetchTodayRecord(workEmployeeId);
  }, [fetchTodayRecord, workEmployeeId]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const res = await getWorkSchedule();
      if (!mounted || !res.success) return;
      setScheduleToTime(res.data.toTime || "18:00");
      setScheduleBreak(res.data.breakMinutes || 60);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      if (!workEmployeeId) {
        if (mounted) {
          setWfhAllowed(false);
          setWfh(false);
        }
        return;
      }
      const res = await getWfhEligibility(workEmployeeId);
      if (!mounted) return;
      const allowed = Boolean(res.success && res.data.allowed);
      setWfhAllowed(allowed);
      if (!allowed) setWfh(false);
    })();
    return () => {
      mounted = false;
    };
  }, [workEmployeeId]);

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

  useEffect(() => {
    if (error) {
      toast.error(t(error));
      clearError();
    }
  }, [error, t, clearError]);

  const clearBurst = useCallback(() => setBurst(null), []);

  async function handleCheckIn() {
    const ok = await checkIn({ wfh: wfh && wfhAllowed });
    if (ok) {
      setBurst("check-in");
      toast.success(
        wfh && wfhAllowed
          ? t("attendance.checkInWfhSuccess")
          : t("attendance.checkInSuccess")
      );
      setWfh(false);
    }
  }

  async function handleCheckOut() {
    const ok = await checkOut();
    if (ok) {
      setBurst("check-out");
      const record = useAttendanceStore.getState().todayRecord;
      toast.success(
        record?.isEarlyLeave
          ? t("attendance.checkOutEarlySuccess")
          : t("attendance.checkOutSuccess")
      );
    }
  }

  const hoursDisplay = todayRecord?.checkIn
    ? isLive
      ? formatLiveDuration(liveSeconds)
      : formatHmDuration(
          todayRecord.workingMinutes || Math.floor(liveSeconds / 60),
          t
        )
    : "—";

  const statusDisplay = todayRecord?.status ?? "absent";

  const metricItems = [
    {
      key: "status",
      label: t("attendance.currentStatus"),
      value: t(`status.${statusDisplay}`),
      mono: false,
    },
    {
      key: "in",
      label: t("attendance.checkedInTime"),
      value: formatTime(todayRecord?.checkIn, dateLocale),
      mono: true,
    },
    {
      key: "expected",
      label: t("attendance.scheduledEnd"),
      value: formatTime(expectedOut ?? undefined, dateLocale),
      mono: true,
    },
    {
      key: "hours",
      label: isLive
        ? t("attendance.workingHoursToday")
        : t("attendance.netHours"),
      value: hoursDisplay,
      mono: true,
      live: isLive,
    },
    {
      key: "mode",
      label: t("attendance.workModeLabel"),
      value: t(`attendance.workMode.${workMode}`),
      mono: false,
    },
  ];

  const actionButtons = (
    <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
      <motion.div
        whileHover={
          reduceMotion || !canCheckIn ? undefined : { scale: 1.01, y: -1 }
        }
        whileTap={reduceMotion || !canCheckIn ? undefined : { scale: 0.98 }}
        transition={snappySpring}
      >
        <Button
          size="xl"
          className={cn(
            "h-12 w-full gap-3 text-base sm:h-14",
            !canCheckIn && "opacity-60"
          )}
          disabled={!canCheckIn || isCheckingIn || !!burst}
          onClick={() => void handleCheckIn()}
          aria-label={t("attendance.checkIn")}
          aria-busy={isCheckingIn}
        >
          {isCheckingIn ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          ) : (
            <LogIn className="h-5 w-5" aria-hidden />
          )}
          {isCheckingIn ? t("attendance.checkingIn") : t("attendance.checkIn")}
        </Button>
      </motion.div>

      <motion.div
        whileHover={
          reduceMotion || !canCheckOut ? undefined : { scale: 1.01, y: -1 }
        }
        whileTap={reduceMotion || !canCheckOut ? undefined : { scale: 0.98 }}
        transition={softSpring}
      >
        <Button
          size="xl"
          variant={canCheckOut ? "default" : "outline"}
          className={cn(
            "h-12 w-full gap-3 text-base sm:h-14",
            canCheckOut
              ? "bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
              : "border-primary/25 hover:bg-primary/8",
            !canCheckOut && "opacity-60"
          )}
          disabled={!canCheckOut || isCheckingOut || !!burst}
          onClick={() => void handleCheckOut()}
          aria-label={t("attendance.checkOut")}
          aria-busy={isCheckingOut}
        >
          {isCheckingOut ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          ) : (
            <LogOut className="h-5 w-5" aria-hidden />
          )}
          {isCheckingOut
            ? t("attendance.checkingOut")
            : t("attendance.checkOut")}
        </Button>
      </motion.div>
    </div>
  );

  const wfhToggle =
    canCheckIn && wfhAllowed ? (
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between list-row px-3.5 py-3 sm:px-4"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/12 text-sky-600 dark:text-sky-400">
            <Home className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <Label htmlFor="wfh-toggle" className="cursor-pointer">
              {t("attendance.wfhMode")}
            </Label>
            <p className="text-xs text-muted-foreground">
              {t("attendance.wfhHint")}
            </p>
          </div>
        </div>
        <Switch
          id="wfh-toggle"
          checked={wfh}
          onCheckedChange={setWfh}
          aria-label={t("attendance.wfhMode")}
        />
      </motion.div>
    ) : null;

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
          {/* Mobile: timer-first composition */}
          <div className="sm:hidden">
            <div
              className={cn(
                "relative overflow-hidden rounded-2xl border px-4 py-5 text-center",
                isLive
                  ? "border-emerald-500/25 bg-gradient-to-b from-emerald-500/[0.08] to-muted/20"
                  : todayRecord?.checkOut
                    ? "border-primary/15 bg-gradient-to-b from-primary/[0.06] to-muted/20"
                    : "border-border/70 bg-gradient-to-b from-muted/40 to-muted/15"
              )}
            >
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                {isLive
                  ? t("attendance.liveTimer")
                  : todayRecord?.checkOut
                    ? t("attendance.sessionComplete")
                    : t("attendance.workingHoursToday")}
              </p>
              <AnimatePresence mode="wait">
                <motion.p
                  key={hoursDisplay}
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.22, ease: easeOutExpo }}
                  className="mt-2 font-mono text-[2.35rem] font-semibold leading-none tracking-tight tabular-nums"
                >
                  {hoursDisplay}
                </motion.p>
              </AnimatePresence>
              {isLive ? (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-600 dark:bg-emerald-400" />
                  {t("attendance.liveBadge")} ·{" "}
                  {formatTime(todayRecord?.checkIn, dateLocale)}
                </p>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  {t(`attendance.workMode.${workMode}`)} ·{" "}
                  {t(`status.${statusDisplay}`)}
                </p>
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {metricItems
                .filter((m) => m.key === "in" || m.key === "expected")
                .map((item) => (
                  <MetaChip
                    key={item.key}
                    label={item.label}
                    value={
                      <span className="font-mono text-sm tabular-nums">
                        {item.value}
                      </span>
                    }
                  />
                ))}
            </div>
          </div>

          {/* Desktop / tablet: full metric grid */}
          <motion.div
            variants={staggerFast}
            initial={reduceMotion ? false : "hidden"}
            animate="visible"
            className="hidden gap-2.5 sm:grid sm:grid-cols-2 lg:grid-cols-3"
          >
            {metricItems.map((item) => (
              <motion.div
                key={item.key}
                variants={fadeInUp}
                className={cn(
                  "kpi-tile px-3.5 py-3",
                  item.live && "border-emerald-500/20 ring-1 ring-emerald-500/15"
                )}
              >
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                  {item.label}
                  {item.live ? (
                    <span className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-600 dark:bg-emerald-400" />
                      {t("attendance.liveBadge")}
                    </span>
                  ) : null}
                </p>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={String(item.value)}
                    initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.22, ease: easeOutExpo }}
                    className={cn(
                      "stat-value mt-1.5 text-lg",
                      item.mono && "font-mono"
                    )}
                  >
                    {item.value}
                  </motion.p>
                </AnimatePresence>
              </motion.div>
            ))}
          </motion.div>

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

          {wfhToggle}
          {actionButtons}
        </div>
      </section>
    </motion.div>
  );
}
