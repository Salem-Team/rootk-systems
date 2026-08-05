import { differenceInMinutes, parseISO } from "date-fns";
import { scheduleOnDay } from "@/lib/mock-date";
import type { AttendanceStatus } from "@/types";
import type { AttendancePolicyExtras } from "@/types/org";

export interface WorkClockSchedule {
  fromTime: string;
  toTime: string;
  gracePeriodMinutes: number;
  breakMinutes: number;
  attendancePolicy?: AttendancePolicyExtras;
}

export interface WorkTimeResult {
  /** Elapsed check-in → check-out before break. */
  grossMinutes: number;
  /** Unpaid break actually deducted. */
  breakAppliedMinutes: number;
  /** Net paid working time. */
  workingMinutes: number;
  lateMinutes: number;
  isLate: boolean;
  /** Minutes before scheduled end (0 if on time or late exit). */
  earlyLeaveMinutes: number;
  isEarlyLeave: boolean;
  /** Minutes worked after scheduled end. */
  overtimeMinutes: number;
  /** Scheduled net day length (span − break). */
  scheduledNetMinutes: number;
  /** Suggested status after checkout (preserves wfh). */
  status: AttendanceStatus;
}

/** Parse "HH:mm" or "HH:mm:ss" into total minutes from midnight. */
export function timeToMinutes(hhmm: string): number {
  const [h = "0", m = "0"] = hhmm.split(":");
  return Number(h) * 60 + Number(m);
}

export function scheduledSpanMinutes(fromTime: string, toTime: string): number {
  const span = timeToMinutes(toTime) - timeToMinutes(fromTime);
  return Math.max(span, 0);
}

export function scheduledNetMinutes(
  fromTime: string,
  toTime: string,
  breakMinutes: number
): number {
  return Math.max(scheduledSpanMinutes(fromTime, toTime) - breakMinutes, 0);
}

/**
 * Deduct unpaid break only when the session is long enough that a break is expected.
 * Short / early-leave days are not drained by a full lunch deduction.
 */
export function appliedBreakMinutes(
  grossMinutes: number,
  configuredBreak: number,
  scheduledSpan: number
): number {
  if (configuredBreak <= 0 || grossMinutes <= 0) return 0;
  const eligibleAfter = Math.min(
    5 * 60,
    Math.max(3 * 60, Math.floor(scheduledSpan / 2))
  );
  if (grossMinutes < eligibleAfter) return 0;
  return Math.min(configuredBreak, grossMinutes);
}

export function computeLateMinutes(
  checkIn: Date,
  dateKey: string,
  fromTime: string,
  gracePeriodMinutes: number
): number {
  const start = scheduleOnDay(dateKey, fromTime);
  return Math.max(
    0,
    differenceInMinutes(checkIn, start) - gracePeriodMinutes
  );
}

export function computeEarlyLeaveMinutes(
  checkOut: Date,
  dateKey: string,
  toTime: string,
  gracePeriodMinutes: number
): number {
  const end = scheduleOnDay(dateKey, toTime);
  if (checkOut >= end) return 0;
  const earlyBy = differenceInMinutes(end, checkOut);
  return earlyBy > gracePeriodMinutes ? earlyBy : 0;
}

export function computeOvertimeMinutes(
  checkOut: Date,
  dateKey: string,
  toTime: string,
  gracePeriodMinutes: number
): number {
  const end = scheduleOnDay(dateKey, toTime);
  if (checkOut <= end) return 0;
  const over = differenceInMinutes(checkOut, end);
  return over > gracePeriodMinutes ? over : 0;
}

/**
 * Full day settlement used on check-out (and for recompute / payroll).
 */
export function settleWorkDay(opts: {
  dateKey: string;
  checkInIso: string;
  checkOut: Date;
  schedule: WorkClockSchedule;
  previousStatus: AttendanceStatus;
  wasLate: boolean;
  lateMinutes: number;
}): WorkTimeResult {
  const { dateKey, checkInIso, checkOut, schedule, previousStatus } = opts;
  const checkIn = parseISO(checkInIso);
  const span = scheduledSpanMinutes(schedule.fromTime, schedule.toTime);
  const scheduledNet = scheduledNetMinutes(
    schedule.fromTime,
    schedule.toTime,
    schedule.breakMinutes
  );

  const grossMinutes = Math.max(0, differenceInMinutes(checkOut, checkIn));
  const breakApplied = appliedBreakMinutes(
    grossMinutes,
    schedule.breakMinutes,
    span
  );
  const workingMinutes = Math.max(0, grossMinutes - breakApplied);

  const lateMinutes = Math.max(0, opts.lateMinutes);
  const isLate = lateMinutes > 0 || opts.wasLate;

  const earlyLeaveMinutes = computeEarlyLeaveMinutes(
    checkOut,
    dateKey,
    schedule.toTime,
    schedule.gracePeriodMinutes
  );
  const isEarlyLeave = earlyLeaveMinutes > 0;

  const overtimeMinutes = computeOvertimeMinutes(
    checkOut,
    dateKey,
    schedule.toTime,
    schedule.gracePeriodMinutes
  );

  const halfDayHours = schedule.attendancePolicy?.halfDayHours ?? 4;
  const halfDayThreshold = Math.max(1, halfDayHours) * 60;

  let status: AttendanceStatus = previousStatus;
  if (previousStatus === "wfh") {
    status = "wfh";
  } else if (
    workingMinutes > 0 &&
    workingMinutes <= halfDayThreshold &&
    (isEarlyLeave || workingMinutes < scheduledNet * 0.55)
  ) {
    status = "half_day";
  } else if (isEarlyLeave) {
    status = "early_leave";
  } else if (isLate) {
    status = "late";
  } else {
    status = "present";
  }

  return {
    grossMinutes,
    breakAppliedMinutes: breakApplied,
    workingMinutes,
    lateMinutes,
    isLate,
    earlyLeaveMinutes,
    isEarlyLeave,
    overtimeMinutes,
    scheduledNetMinutes: scheduledNet,
    status,
  };
}

/** Expected check-out instant for the scheduled end of the company day. */
export function expectedCheckOutFromSchedule(
  dateKey: string,
  toTime: string
): Date {
  return scheduleOnDay(dateKey, toTime);
}
