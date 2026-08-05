import { format, isValid, parse, parseISO } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";

/** App-wide 12-hour clock pattern (display only; storage stays HH:mm). */
export const TIME_12H = "h:mm a";
export const DATETIME_12H_SHORT = "MMM d · h:mm a";
export const DATETIME_12H_LONG = "MMM d, yyyy · h:mm a";

export type ClockPeriod = "AM" | "PM";

export function dateFnsLocale(locale?: string) {
  return locale === "ar" ? arLocale : enUS;
}

function normalizeHm(hm: string): string {
  const trimmed = hm.trim();
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(trimmed)) {
    const [h, m] = trimmed.split(":");
    return `${h.padStart(2, "0")}:${m}`;
  }
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
    const [h, m] = trimmed.split(":");
    return `${h.padStart(2, "0")}:${m}`;
  }
  return trimmed;
}

/** Format stored "HH:mm" (or HH:mm:ss) as 12-hour clock. */
export function formatClockHm(
  hm: string | null | undefined,
  locale: string = "en"
): string {
  if (!hm) return "—";
  const normalized = normalizeHm(hm);
  const parsed = parse(normalized, "HH:mm", new Date());
  if (!isValid(parsed)) return hm;
  return format(parsed, TIME_12H, { locale: dateFnsLocale(locale) });
}

/** Format a from–to clock range in 12-hour. */
export function formatClockRange(
  from: string | null | undefined,
  to: string | null | undefined,
  locale: string = "en"
): string {
  if (!from && !to) return "—";
  return `${formatClockHm(from, locale)} – ${formatClockHm(to, locale)}`;
}

/** Format an ISO datetime to 12-hour clock only. */
export function formatIsoClock(
  iso: string | null | undefined,
  locale: string = "en"
): string {
  if (!iso) return "—";
  const d = parseISO(iso);
  if (!isValid(d)) return "—";
  return format(d, TIME_12H, { locale: dateFnsLocale(locale) });
}

/** Format an ISO/Date value with date + 12-hour time. */
export function formatIsoDateTime(
  value: string | Date | null | undefined,
  locale: string = "en",
  pattern: string = DATETIME_12H_LONG
): string {
  if (!value) return "—";
  const d = typeof value === "string" ? parseISO(value) : value;
  if (!isValid(d)) return "—";
  return format(d, pattern, { locale: dateFnsLocale(locale) });
}

export function parseHmTo12(hm: string): {
  hour12: number;
  minute: number;
  period: ClockPeriod;
} {
  const normalized = normalizeHm(hm || "09:00");
  const [hStr, mStr] = normalized.split(":");
  let hour24 = Number(hStr);
  const minute = Number(mStr);
  if (!Number.isFinite(hour24) || !Number.isFinite(minute)) {
    return { hour12: 9, minute: 0, period: "AM" };
  }
  hour24 = ((hour24 % 24) + 24) % 24;
  const period: ClockPeriod = hour24 >= 12 ? "PM" : "AM";
  let hour12 = hour24 % 12;
  if (hour12 === 0) hour12 = 12;
  return { hour12, minute: Math.min(59, Math.max(0, minute)), period };
}

export function compose12ToHm(
  hour12: number,
  minute: number,
  period: ClockPeriod
): string {
  const h12 = Math.min(12, Math.max(1, hour12));
  const m = Math.min(59, Math.max(0, minute));
  let hour24 = h12 % 12;
  if (period === "PM") hour24 += 12;
  return `${String(hour24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
