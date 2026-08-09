import { format, parseISO } from "date-fns";

export function formatMaybeDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "d MMM yyyy · HH:mm");
  } catch {
    return iso;
  }
}
