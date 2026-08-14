import { format } from "date-fns";
import { formatIsoDateTime } from "@/lib/format-time";

export function formatMaybeDateTime(iso: string | null | undefined): string {
  return formatIsoDateTime(iso, "en", "d MMM yyyy · h:mm a");
}

/** Format hour-of-day (0–23) as 12-hour clock for charts/API labels. */
export function formatHour12Label(hour: number): string {
  const h = ((Math.trunc(hour) % 24) + 24) % 24;
  const d = new Date(2000, 0, 1, h, 0, 0);
  return format(d, "h:00 a");
}
