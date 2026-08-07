/**
 * Flexible date/time parsing for targets & tasks.
 * Accepts: YYYY-MM-DD | YYYY-MM-DDTHH:mm | YYYY-MM-DDTHH:mm:ss | ISO with Z/offset.
 */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?$/;

export type DateTimeBoundary = "start" | "end" | "exact";

export function hasTimeComponent(value: string): boolean {
  const v = value.trim();
  return v.includes("T") || /[Zz]|[+-]\d{2}:?\d{2}$/.test(v);
}

/** Pad datetime-local to seconds if needed. */
function ensureLocalSeconds(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return `${value}:00`;
  return value;
}

/**
 * Parse user/API datetime into a real Instant.
 * Date-only + start → 00:00:00 local; date-only + end → 23:59:59.999 local.
 */
export function parseFlexibleDateTime(
  value: string,
  boundary: DateTimeBoundary = "exact"
): Date {
  const raw = value.trim();
  if (!raw) throw new Error("Empty datetime");

  if (DATE_ONLY.test(raw)) {
    if (boundary === "end") return new Date(`${raw}T23:59:59.999`);
    return new Date(`${raw}T00:00:00.000`);
  }

  if (DATETIME_LOCAL.test(raw)) {
    return new Date(ensureLocalSeconds(raw));
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid datetime: ${raw}`);
  }
  return parsed;
}

export function tryParseFlexibleDateTime(
  value: string | null | undefined,
  boundary: DateTimeBoundary = "exact"
): Date | null {
  if (!value?.trim()) return null;
  try {
    return parseFlexibleDateTime(value, boundary);
  } catch {
    return null;
  }
}

/** True when end is on/after start (same day / same minute allowed). */
export function isValidDateTimeRange(start: string, end: string): boolean {
  const a = tryParseFlexibleDateTime(start, "start");
  const b = tryParseFlexibleDateTime(end, "end");
  if (!a || !b) return false;
  return b.getTime() >= a.getTime();
}

/** Value for `<input type="datetime-local" />` (local, no Z). */
export function toDateTimeLocalValue(
  value: string | Date | null | undefined
): string {
  if (!value) return "";
  const d =
    typeof value === "string"
      ? tryParseFlexibleDateTime(value, "exact")
      : value;
  if (!d || Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${hh}:${mm}`;
}

/** Persist as ISO UTC string. */
export function toStorageIso(
  value: string,
  boundary: DateTimeBoundary = "exact"
): string {
  return parseFlexibleDateTime(value, boundary).toISOString();
}

/** Round to nearest minute for defaults. */
export function roundToMinute(d = new Date()): Date {
  const next = new Date(d);
  next.setSeconds(0, 0);
  return next;
}

/** Default assign window: now → +14 days at 18:00 local (same-day also valid). */
export function defaultTargetWindow(now = new Date()): {
  start: string;
  end: string;
} {
  const start = roundToMinute(now);
  const end = new Date(start);
  end.setDate(end.getDate() + 14);
  end.setHours(18, 0, 0, 0);
  return {
    start: toDateTimeLocalValue(start),
    end: toDateTimeLocalValue(end),
  };
}

/** Zod-friendly: non-empty flexible datetime string. */
export function isFlexibleDateTimeString(value: string): boolean {
  return tryParseFlexibleDateTime(value, "exact") !== null;
}
