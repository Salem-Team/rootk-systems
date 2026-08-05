/** Pure work-day settlement (mirrors frontend src/lib/work-time.ts). */

const CAIRO_OFFSET = "+03:00";

export type AttendanceStatus =
  | "present"
  | "absent"
  | "late"
  | "wfh"
  | "on_leave"
  | "half_day"
  | "early_leave";

export interface WorkClockSchedule {
  fromTime: string;
  toTime: string;
  gracePeriodMinutes: number;
  breakMinutes: number;
  halfDayHours?: number;
}

export interface WorkTimeResult {
  grossMinutes: number;
  breakAppliedMinutes: number;
  workingMinutes: number;
  lateMinutes: number;
  isLate: boolean;
  earlyLeaveMinutes: number;
  isEarlyLeave: boolean;
  overtimeMinutes: number;
  scheduledNetMinutes: number;
  status: AttendanceStatus;
}

export function scheduleOnDay(dateKey: string, hhmm: string): Date {
  const time = hhmm.length === 5 ? `${hhmm}:00` : hhmm;
  return new Date(`${dateKey}T${time}${CAIRO_OFFSET}`);
}

export function timeToMinutes(hhmm: string): number {
  const [h = "0", m = "0"] = hhmm.split(":");
  return Number(h) * 60 + Number(m);
}

export function scheduledSpanMinutes(fromTime: string, toTime: string): number {
  return Math.max(timeToMinutes(toTime) - timeToMinutes(fromTime), 0);
}

export function scheduledNetMinutes(
  fromTime: string,
  toTime: string,
  breakMinutes: number
): number {
  return Math.max(scheduledSpanMinutes(fromTime, toTime) - breakMinutes, 0);
}

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

function diffMinutes(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 60000);
}

export function computeLateMinutes(
  checkIn: Date,
  dateKey: string,
  fromTime: string,
  gracePeriodMinutes: number
): number {
  const start = scheduleOnDay(dateKey, fromTime);
  return Math.max(0, diffMinutes(start, checkIn) - gracePeriodMinutes);
}

export function computeEarlyLeaveMinutes(
  checkOut: Date,
  dateKey: string,
  toTime: string,
  gracePeriodMinutes: number
): number {
  const end = scheduleOnDay(dateKey, toTime);
  if (checkOut >= end) return 0;
  const earlyBy = diffMinutes(checkOut, end);
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
  const over = diffMinutes(end, checkOut);
  return over > gracePeriodMinutes ? over : 0;
}

export function settleWorkDay(opts: {
  dateKey: string;
  checkIn: Date;
  checkOut: Date;
  schedule: WorkClockSchedule;
  previousStatus: AttendanceStatus;
  wasLate: boolean;
  lateMinutes: number;
}): WorkTimeResult {
  const { dateKey, checkIn, checkOut, schedule, previousStatus } = opts;
  const span = scheduledSpanMinutes(schedule.fromTime, schedule.toTime);
  const scheduledNet = scheduledNetMinutes(
    schedule.fromTime,
    schedule.toTime,
    schedule.breakMinutes
  );

  const grossMinutes = Math.max(0, diffMinutes(checkIn, checkOut));
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

  const halfDayHours = schedule.halfDayHours ?? 4;
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

export function dateKeyFromDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function utcDay(now = new Date()): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
}
