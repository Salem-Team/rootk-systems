import { scheduleOnDay } from "./work-time";

/** Cairo calendar day as YYYY-MM-DD. */
export function cairoDateKey(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * Decide auto check-out time for an open attendance day.
 * - After scheduled end (default 17:00) when check-in was before end → end time
 * - After the calendar day has fully passed (stale open day) → max(end, checkIn)
 * - Otherwise leave open (null)
 */
export function resolveAutoCheckOutAt(opts: {
  dateKey: string;
  checkIn: Date;
  toTime: string;
  now?: Date;
}): Date | null {
  const now = opts.now ?? new Date();
  const end = scheduleOnDay(opts.dateKey, opts.toTime);
  if (now < end) return null;

  if (opts.checkIn.getTime() < end.getTime()) {
    return end;
  }

  // Checked in after shift end: keep open until the Cairo day rolls over.
  if (opts.dateKey >= cairoDateKey(now)) return null;
  return opts.checkIn.getTime() > end.getTime() ? opts.checkIn : end;
}
