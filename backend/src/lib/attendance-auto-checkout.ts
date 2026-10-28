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

/** Next calendar day for a YYYY-MM-DD key (UTC date arithmetic). */
export function nextDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const next = new Date(Date.UTC(y!, (m ?? 1) - 1, (d ?? 1) + 1));
  return next.toISOString().slice(0, 10);
}

/**
 * Midnight that ends the attendance Cairo day (= 00:00 of the next day).
 * Forced auto check-out runs at this instant, not at the shift end (e.g. 17:00).
 */
export function attendanceDayMidnight(dateKey: string): Date {
  return scheduleOnDay(nextDateKey(dateKey), "00:00");
}

/**
 * Decide auto check-out time for an open attendance day.
 * Closes at Cairo midnight after the day (12:00 AM) — employees stay open
 * past shift end until then. Stale open days close once midnight has passed.
 */
export function resolveAutoCheckOutAt(opts: {
  dateKey: string;
  checkIn: Date;
  /** Kept for callers; shift end no longer forces checkout. */
  toTime?: string;
  now?: Date;
}): Date | null {
  const now = opts.now ?? new Date();
  const midnight = attendanceDayMidnight(opts.dateKey);
  if (now < midnight) return null;

  // Record checkout at midnight; never before the actual check-in.
  return opts.checkIn.getTime() > midnight.getTime()
    ? opts.checkIn
    : midnight;
}
