/**
 * Flexible date/time parsing for targets & tasks.
 * Accepts: YYYY-MM-DD | YYYY-MM-DDTHH:mm | YYYY-MM-DDTHH:mm:ss | ISO with Z/offset.
 */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?$/;

export type DateTimeBoundary = "start" | "end" | "exact";

function ensureLocalSeconds(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return `${value}:00`;
  return value;
}

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

export function isValidDateTimeRange(start: string, end: string): boolean {
  const a = tryParseFlexibleDateTime(start, "start");
  const b = tryParseFlexibleDateTime(end, "end");
  if (!a || !b) return false;
  return b.getTime() >= a.getTime();
}
