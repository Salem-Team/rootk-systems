import { useCallback, useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { toast } from "sonner";
import type { AttendanceBurstKind } from "@/components/attendance/attendance-success";
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
import { demoTodayKey } from "@/lib/mock-date";
import { getWfhEligibility, getWorkSchedule } from "@/services/schedule.service";
import { useTranslation } from "@/hooks/use-translation";
import { formatHmDuration } from "@/lib/duration-format";
import { elapsedSeconds, formatLiveDuration } from "@/lib/utils";

type Locale = typeof enUS;

export function formatTime(iso: string | undefined, dateLocale: Locale): string {
  if (!iso) return "—";
  return format(parseISO(iso), "h:mm a", { locale: dateLocale });
}

export function useCheckInPanel() {
  const { t, locale } = useTranslation();
  const dateLocale = locale === "ar" ? arLocale : enUS;
  const todayRecord = useAttendanceStore((s) => s.todayRecord);
  const isCheckingIn = useAttendanceStore((s) => s.isCheckingIn);
  const isCheckingOut = useAttendanceStore((s) => s.isCheckingOut);
  const error = useAttendanceStore((s) => s.error);
  const errorDetail = useAttendanceStore((s) => s.errorDetail);
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
      toast.error(t(error), errorDetail ? { description: errorDetail } : undefined);
      clearError();
    }
  }, [error, errorDetail, t, clearError]);

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

  return {
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
  };
}

export type MetricItem = ReturnType<typeof useCheckInPanel>["metricItems"][number];
