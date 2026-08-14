import { formatIsoDateTime } from "@/lib/format-time";

export function formatMaybeDateTime(iso: string | null | undefined): string {
  return formatIsoDateTime(iso, "en", "d MMM yyyy · h:mm a");
}
